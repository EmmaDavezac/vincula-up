import { inject, Injectable, computed, effect, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile, UserRole } from '../models/user-profile';
import { inicioDeSesion } from '../guards/role.guard';
import { FotoService } from './foto.service';
import { VERSION_TERMINOS } from '../../legal/terminos/terminos';

interface UsuarioLookupResponse {
  id: string;
  keycloakId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  /** Clave del archivo de la foto en el servidor. No es una URL: la imagen se
   *  pide por `GET /api/usuarios/{id}/foto`, que valida sesión y rol. */
  fotoUrl?: string | null;
  /** Si aceptó alguna versión de los términos. La vigente la compara el frontend. */
  terminosAceptado?: boolean;
  /** Versión de los términos que aceptó. */
  terminosVersion?: string | null;
  terminosAceptadoEn?: string | null;
  rolNegocio: UserRole;
  fechaAlta?: string;
}

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
  scope?: string;
}

const TOKEN_KEY = 'vincula-up-token';
const REFRESH_TOKEN_KEY = 'vincula-up-refresh-token';
const ID_TOKEN_KEY = 'vincula-up-id-token';
const PROFILE_KEY = 'vincula-up-profile';
const KEYCLOAK_STATE_KEY = 'vincula-up-keycloak-state';
const KEYCLOAK_NONCE_KEY = 'vincula-up-keycloak-nonce';
const KEYCLOAK_PKCE_VERIFIER_KEY = 'vincula-up-pkce-verifier';
const PROF_ACTIVE_KEY = 'vincula-up-prof-active';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<UserProfile | null>(this.restoreSession());
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  /**
   * Pide las fotos de perfil. No depende de AuthService (evitaría un ciclo), así
   * que el token se le pasa desde acá con `establecerToken`.
   */
  private readonly fotos = inject(FotoService);
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isProfessionalActive = signal<boolean>(this.restoreProfActive());
  readonly loginError = signal('');
  /** Evita reintentos en loop al refrescar el token tras una promoción de rol. */
  private roleRefreshRequested = false;
  /** La foto propia y el estado legal se piden una sola vez por sesión. */
  private photoRequested = false;
  /** Si el backend ya respondió sobre la cuenta. Antes de eso no se sabe. */
  private readonly cuentaConsultada = signal(false);
  /** Si aceptó la versión vigente de los términos. */
  private readonly terminosAceptados = signal(false);

  constructor() {
    this.handleCodeCallback();
    this.fotos.establecerToken(this.getToken());

    // La foto de perfil se pide sola cuando hay sesión con token: así el avatar
    // aparece con la foto real sin importar si la navbar estaba en pantalla antes
    // del login o después (login por callback de Keycloak).
    if (this.user()) {
      this.loadOwnPhoto();
    }
    effect(() => {
      const user = this.user();
      if (user) {
        this.loadOwnPhoto();
      }
    });

    if (this.user()?.role === 'PROFESIONAL') {
      this.checkProfessionalStatus();
    }
  }

  loginWithKeycloak(): Observable<boolean> {
    this.loginError.set('');
    const state = this.randomValue();
    const nonce = this.randomValue();
    sessionStorage.setItem(KEYCLOAK_STATE_KEY, state);
    sessionStorage.setItem(KEYCLOAK_NONCE_KEY, nonce);

    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;

    // Generar PKCE code_verifier y code_challenge (S256) requerido por el realm
    this.generatePkce().then(({ verifier, challenge }) => {
      sessionStorage.setItem(KEYCLOAK_PKCE_VERIFIER_KEY, verifier);

      const params = new URLSearchParams({
        client_id: environment.keycloakClientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state,
        nonce,
        response_mode: 'query',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });

      const authorizeUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/auth?${params.toString()}`;
      window.location.href = authorizeUrl;
    });

    return of(true);
  }

  /**
   * Abre la página de registro del realm. Los clientes se auto-gestionan y un
   * profesional invitado crea acá su cuenta con el email que cargó el
   * administrador: al entrar por primera vez el sistema lo reconoce por email y
   * le otorga el rol PROFESIONAL.
   */
  registerWithKeycloak(): void {
    this.loginError.set('');
    const state = this.randomValue();
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;
    // Se reutiliza la misma clave de state que el login: el callback lo valida igual.
    sessionStorage.setItem(KEYCLOAK_STATE_KEY, state);

    // PKCE (S256) es obligatorio en el realm: la URL de registro debe
    // construirse DESPUÉS de generar el challenge, no antes.
    this.generatePkce().then(({ verifier, challenge }) => {
      sessionStorage.setItem(KEYCLOAK_PKCE_VERIFIER_KEY, verifier);

      const params = new URLSearchParams({
        client_id: environment.keycloakClientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        state,
        response_mode: 'query',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });

      window.location.href =
        `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/registrations?${params.toString()}`;
    });
  }

  loginDirect(username: string, password = 'password'): Observable<boolean> {
    this.loginError.set('');
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', environment.keycloakClientId)
      .set('username', username)
      .set('password', password)
      .set('scope', 'openid profile email');

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const tokenUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`;

    return this.http.post<KeycloakTokenResponse>(tokenUrl, body.toString(), { headers }).pipe(
      switchMap((token) => this.maybeUseToken(token)),
      // Igual que en el callback de Keycloak: al entrar se va a la sección del rol.
      tap((ok) => {
        if (ok) {
          void this.irASeccionDelRol();
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.loginError.set(this.describeError(error, 'No se pudo iniciar sesión con las credenciales indicadas.'));
        return of(false);
      }),
    );
  }

  logout(): void {
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROF_ACTIVE_KEY);
    this.user.set(null);
    this.isProfessionalActive.set(false);
    // La próxima sesión vuelve a pedir la foto de la cuenta nueva.
    this.photoRequested = false;
    // Las fotos cacheadas eran de la sesión que termina: se liberan las URLs blob
    // para no dejarlas colgadas y para que la cuenta siguiente no las herede.
    this.fotos.limpiar();

    // Cerrar la sesión en Keycloak (RP-Initiated Logout)
    // Sin esto, Keycloak recuerda la sesión SSO y loguea automáticamente
    const postLogoutUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;
    const params = new URLSearchParams({
      client_id: environment.keycloakClientId,
      post_logout_redirect_uri: postLogoutUri,
    });
    if (idToken) {
      params.set('id_token_hint', idToken);
    }
    const logoutUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/logout?${params.toString()}`;
    window.location.href = logoutUrl;
  }

  refreshSession(): void {
    const session = this.restoreSession();
    this.user.set(session);
    if (session?.role !== 'PROFESIONAL') {
      this.setProfessionalActive(false);
    }
  }

  hasRole(role: UserRole): boolean {
    return this.user()?.role === role;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getKeycloakId(): string | null {
    const token = this.getToken();
    if (!token) return null;
    const claims = this.decodeToken(token);
    return claims?.sub ?? null;
  }

  private handleCodeCallback(): void {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const storedState = sessionStorage.getItem(KEYCLOAK_STATE_KEY);

    if (!code || !returnedState || returnedState !== storedState) {
      return;
    }

    sessionStorage.removeItem(KEYCLOAK_STATE_KEY);
    sessionStorage.removeItem(KEYCLOAK_NONCE_KEY);

    // Recuperar el code_verifier PKCE generado en loginWithKeycloak()
    const codeVerifier = sessionStorage.getItem(KEYCLOAK_PKCE_VERIFIER_KEY) ?? '';
    sessionStorage.removeItem(KEYCLOAK_PKCE_VERIFIER_KEY);

    // Limpiar params de la URL para evitar re-ejecución al recargar
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    this.loginError.set('');
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/` : environment.keycloakRedirectUri;
    let body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', environment.keycloakClientId)
      .set('code', code)
      .set('redirect_uri', redirectUri)
      .set('scope', 'openid profile email');

    // Incluir code_verifier (obligatorio cuando se usó PKCE)
    if (codeVerifier) {
      body = body.set('code_verifier', codeVerifier);
    }

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const tokenUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`;

    this.http.post<KeycloakTokenResponse>(tokenUrl, body.toString(), { headers })
      .pipe(
        switchMap((token) => this.maybeUseToken(token)),
        catchError((error: HttpErrorResponse) => {
          this.loginError.set(this.describeError(error, 'No se pudo completar el login con Keycloak.'));
          return of(false);
        }),
      )
      .subscribe((ok) => {
        // El login se completa de forma asíncrona: cuando vuelve del proveedor el
        // router ya pasó por la landing (aún sin token), así que acá se entra
        // derecho a la sección del rol y la portada queda inaccesible.
        if (ok) {
          void this.irASeccionDelRol();
        }
      });
  }

  /** Lleva a la sección que corresponde al rol con sesión (ver `inicioDeSesion`). */
  private irASeccionDelRol(): Promise<boolean> {
    return this.router.navigateByUrl(inicioDeSesion(this.user()?.role), { replaceUrl: true });
  }

  private maybeUseToken(token: KeycloakTokenResponse): Observable<boolean> {
    try {
      const claims = this.decodeToken(token.access_token);
      if (!claims || !claims.sub || !claims.role) {
        this.loginError.set('La respuesta de Keycloak no incluye el rol necesario para Vincula-UP.');
        return of(false);
      }

      const lookupParams = new HttpParams()
        .set('keycloakId', claims.sub)
        .set('email', claims.email ?? '')
        .set('nombre', claims.name ?? '')
        .set('rol', claims.role ?? '');

      const lookupHeaders = new HttpHeaders({ Authorization: `Bearer ${token.access_token}` });
      return this.http.get<UsuarioLookupResponse>(`${environment.apiUrl}/usuarios/por-keycloak`, { params: lookupParams, headers: lookupHeaders }).pipe(
        map((usuario) => {
          const profile = {
            id: usuario.id,
            name: `${usuario.nombre} ${usuario.apellido}`.trim(),
            role: usuario.rolNegocio,
            roleLabel: this.roleLabel(usuario.rolNegocio),
            // Se completa en `loadOwnPhoto`, que consulta la cuenta: acá todavía
            // no se sabe si hay foto.
            tieneFoto: Boolean(usuario.fotoUrl && usuario.fotoUrl.trim().length > 0),
          } satisfies UserProfile;

          this.persistSession(token, profile);
          return true;
        }),
        catchError(() => {
          const profile = {
            id: claims.sub ?? '',
            name: claims.name ?? 'Usuario Vincula-UP',
            role: claims.role as UserRole,
            roleLabel: this.roleLabel(claims.role as UserRole),
            tieneFoto: false,
          } satisfies UserProfile;

          this.persistSession(token, profile);
          return of(true);
        }),
      );
    } catch {
      this.loginError.set('No se pudo procesar la respuesta real de Keycloak.');
      return of(false);
    }
  }

  /**
   * Guarda la sesión (access + refresh token) y dispara las tareas posteriores
   * al login. Se usa tanto en el login exitoso como en el fallback cuando
   * ms-usuarios todavía no responde.
   */
  private persistSession(token: KeycloakTokenResponse, profile: UserProfile): void {
    localStorage.setItem(TOKEN_KEY, token.access_token);
    if (token.refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);
    if (token.id_token) localStorage.setItem(ID_TOKEN_KEY, token.id_token);
    this.persistProfile(profile);
    this.user.set(profile);
    // El token es nuevo (login o refresh): el FotoService lo necesita a mano
    // para poder pedir las fotos con el header de autorización.
    this.fotos.establecerToken(token.access_token);
    if (profile.role === 'PROFESIONAL') {
      this.checkProfessionalStatus();
    }
    this.loginError.set('');
    this.sincronizarRolConKeycloak(token.access_token, profile);
    // La foto se pide apenas hay token: al terminar el login el avatar ya muestra
    // la imagen real (o iniciales, si la cuenta todavía no tiene foto).
    this.loadOwnPhoto();
  }

  /**
   * Un profesional invitado se auto-registra con el rol CLIENTE por defecto: el
   * backend le otorga PROFESIONAL en Keycloak durante ese primer login, pero el
   * token ya emitido sigue diciendo CLIENTE. Acá pedimos un token nuevo para que
   * el rol viaje actualizado y pueda activar su perfil. Se intenta una sola vez.
   */
  private sincronizarRolConKeycloak(accessToken: string, profile: UserProfile): void {
    if (profile.role !== 'PROFESIONAL' || this.tokenRole(accessToken) === 'PROFESIONAL' || this.roleRefreshRequested) {
      return;
    }
    this.roleRefreshRequested = true;
    this.refreshAccessToken().subscribe(() => {
      this.roleRefreshRequested = false;
    });
  }

  /**
   * Canjea el refresh token por un access token nuevo. Keycloak re-evalúa los
   * roles al emitirlo, así el token refleja la promoción recién aplicada.
   */
  refreshAccessToken(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(false);
    }
    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('client_id', environment.keycloakClientId)
      .set('refresh_token', refreshToken);
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const tokenUrl = `${this.getKeycloakUrl()}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`;

    return this.http.post<KeycloakTokenResponse>(tokenUrl, body.toString(), { headers }).pipe(
      switchMap((token) => this.maybeUseToken(token)),
      catchError(() => of(false)),
    );
  }

  private getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private tokenRole(token: string): UserRole | undefined {
    return this.decodeToken(token)?.role;
  }

  private restoreSession(): UserProfile | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      localStorage.removeItem(PROFILE_KEY);
      return null;
    }

    const payload = this.decodeToken(token);
    if (!payload || !payload.role || !this.isValidRole(payload.role)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROFILE_KEY);
      return null;
    }

    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as UserProfile;
        if (parsed && parsed.id && parsed.role && this.isValidRole(parsed.role)) {
          // Normaliza el campo: los perfiles guardados antes de que existiera
          // `tieneFoto` (guardaban la URL de la foto) llegan sin él.
          return { ...parsed, tieneFoto: parsed.tieneFoto === true };
        }
      } catch {
        localStorage.removeItem(PROFILE_KEY);
      }
    }

    return {
      id: payload.sub ?? '',
      name: payload.name ?? 'Usuario Vincula-UP',
      role: payload.role,
      roleLabel: this.roleLabel(payload.role),
      tieneFoto: false,
    };
  }

  private restoreProfActive(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(PROF_ACTIVE_KEY) === 'true';
  }

  checkProfessionalStatus(): void {
    this.loadProfessionalStatus().subscribe();
  }

  /**
   * Datos de la cuenta con sesión: la foto de perfil y el estado legal.
   *
   * <p>Una sola llamada contra {@code /api/usuarios/yo} trae las dos cosas: si hay
   * foto para que la pida el {@link FotoService}, y si aceptó los términos
   * vigentes. Se consulta una vez por sesión. Si algo falla (servidor caído, cuenta
   * suspendida, sin permiso) el avatar cae a iniciales y la navegación sigue.
   *
   * <p>Ante un fallo no se da el estado legal por conocido: `terminosPendientes`
   * devuelve {@code true} y el modal se queda esperando, en vez de dejar pasar a
   * alguien que no aceptó.
   */
  loadOwnPhoto(force = false): void {
    const current = this.user();
    if (!current) {
      return;
    }
    // Sin token todavía (p. ej. la navbar se montó antes de completar el login):
    // no se marca como pedida para reintentar cuando la sesión esté lista.
    const token = this.getToken();
    if (!token) {
      return;
    }
    if (!force && this.photoRequested) {
      return;
    }
    this.photoRequested = true;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http
      .get<UsuarioLookupResponse>(`${environment.apiUrl}/usuarios/yo`, { headers })
      .pipe(
        map((cuenta) => {
          const tieneFoto = Boolean(cuenta?.fotoUrl && cuenta.fotoUrl.trim().length > 0);
          this.refreshProfile({ tieneFoto });
          this.cuentaConsultada.set(true);
          // La versión vigente la publica el frontend (es donde vive el texto):
          // si cambió lo que aceptó, hay que volver a pedirlo.
          this.terminosAceptados.set(
            cuenta?.terminosAceptado === true && cuenta.terminosVersion === VERSION_TERMINOS,
          );
          if (tieneFoto) {
            this.fotos.cargar(cuenta!.id);
          }
          return cuenta;
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  /**
   * Si hay que pedir los términos y condiciones.
   *
   * <p>Es {@code true} con sesión abierta y sin aceptación de la versión vigente.
   * Antes de que responda el backend se considera {@code true}: se prefiere mostrar
   * el modal un instante antes de bloquear de más, y no al revés. El modal es una capa
   * sobre la aplicación, no una pantalla: no se puede saltar navegando.
   */
  readonly terminosPendientes = computed(() => {
    if (!this.user()) {
      return false;
    }
    if (!this.cuentaConsultada()) {
      return true;
    }
    return !this.terminosAceptados();
  });

  /** Registra la aceptación. La versión viaja al backend para quede registrada. */
  registrarAceptacionTerminos(): Observable<UsuarioLookupResponse> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.getToken() ?? ''}` });
    return this.http
      .patch<UsuarioLookupResponse>(
        `${environment.apiUrl}/terminos/aceptar`,
        { version: VERSION_TERMINOS },
        { headers },
      )
      .pipe(tap(() => this.terminosAceptados.set(true)));
  }

  /**
   * Refresca los datos visibles de la sesión (nombre/email) tras editar el perfil
   * en "Mi cuenta", sin obligar a un re-login.
   */
  refreshProfile(patch: { id?: string; name?: string; tieneFoto?: boolean }): void {
    const current = this.user();
    if (!current) return;
    const updated: UserProfile = {
      ...current,
      id: patch.id ?? current.id,
      name: patch.name ?? current.name,
      tieneFoto: patch.tieneFoto ?? current.tieneFoto,
    };
    this.user.set(updated);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    } catch {
      /* almacenamiento no disponible: se mantiene la sesión en memoria */
    }
  }

  loadProfessionalStatus(): Observable<boolean> {
    const currentUser = this.user();
    if (!currentUser || currentUser.role !== 'PROFESIONAL') {
      this.setProfessionalActive(false);
      return of(false);
    }

    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const keycloakId = this.getKeycloakId();
    let params = new HttpParams().set('usuarioId', currentUser.id);
    if (keycloakId) {
      params = params.set('keycloakId', keycloakId);
    }

    return this.http.get<{ estado?: string }>(`${environment.apiUrl}/profesionales/mi-perfil`, {
      params,
      headers,
    }).pipe(
      catchError(() => of(null)),
      map((perfil) => perfil?.estado === 'ACTIVO' && this.user()?.id === currentUser.id),
      tap((active) => this.setProfessionalActive(active)),
    );
  }

  setProfessionalActive(active: boolean): void {
    this.isProfessionalActive.set(active);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROF_ACTIVE_KEY, active ? 'true' : 'false');
    }
  }

  private persistProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage errors
    }
  }

  private decodeToken(token: string): { sub?: string; name?: string; email?: string; role?: UserRole } | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }
      const payload = parts[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));

      const realmRoles: string[] = [
        ...(Array.isArray(decoded.realm_access?.roles) ? decoded.realm_access.roles : []),
        ...(Array.isArray(decoded.roles) ? decoded.roles : []),
      ];
      const directRole = typeof decoded.role === 'string' ? decoded.role : undefined;
      const matchedRole = realmRoles.find((r) => this.isValidRole(r));
      const role = directRole && this.isValidRole(directRole) ? directRole : matchedRole;

      const name = decoded.name ?? `${decoded.given_name ?? ''} ${decoded.family_name ?? ''}`.trim() ?? decoded.preferred_username;
      return {
        sub: decoded.sub,
        name: name || 'Usuario Vincula-UP',
        email: decoded.email,
        role: role != null && this.isValidRole(role) ? role : undefined,
      };
    } catch {
      return null;
    }
  }

  private describeError(error: unknown, fallback = 'No se pudo completar la operación.'):
    string {
    const status = typeof error === 'object' && error ? Number((error as { status?: number }).status ?? 0) : 0;
    const message = typeof error === 'object' && error
      ? String((error as { message?: string }).message ?? '')
      : '';
    const payload = typeof error === 'object' && error && 'error' in error
      ? (error as { error?: { message?: string; status?: number } }).error
      : undefined;
    const backendMessage = payload?.message ?? (payload as { message?: string } | undefined)?.message ?? message;

    if (status === 401) {
      return 'Necesitás volver a iniciar sesión para continuar.';
    }
    if (status === 403 || /forbidden|denied|permiso/i.test(backendMessage)) {
      return 'No tenés permiso para realizar esta acción.';
    }
    if (status === 404) {
      return 'El recurso solicitado no está disponible en este momento.';
    }
    if (status === 409 || /conflict|estado/i.test(backendMessage)) {
      if (backendMessage) {
        return backendMessage.charAt(0).toUpperCase() + backendMessage.slice(1);
      }
      return 'La solicitud ya está en un estado distinto y no se puede mover ahora.';
    }
    if (backendMessage) {
      return backendMessage;
    }
    return fallback;
  }

  private roleLabel(role: UserRole): string {
    return {
      CLIENTE: 'Cliente',
      PROFESIONAL: 'Profesional',
      ADMIN: 'Administrador',
    }[role] ?? role;
  }

  private isValidRole(role: string): role is UserRole {
    return role === 'CLIENTE' || role === 'PROFESIONAL' || role === 'ADMIN';
  }

  private randomValue(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private async generatePkce(): Promise<{ verifier: string; challenge: string }> {
    // Generar un code_verifier aleatorio de 64 bytes (base64url)
    const verifierBytes = new Uint8Array(64);
    crypto.getRandomValues(verifierBytes);
    const verifier = btoa(String.fromCharCode(...verifierBytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Calcular code_challenge = BASE64URL(SHA256(verifier))
    const encoded = new TextEncoder().encode(verifier);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = new Uint8Array(hashBuffer);
    const challenge = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return { verifier, challenge };
  }

  private getKeycloakUrl(): string {
    if (typeof window !== 'undefined') {
      const { hostname } = window.location;
      // En desarrollo la app corre en `ng serve` (puerto 4200) sin nada por delante,
      // así que se habla directo con Keycloak. En cualquier otro host la sirve nginx,
      // que hace de proxy de /realms/, /js/, /resources/ y /login-actions/ hacia
      // Keycloak: usar el mismo origen deja todo el flujo OIDC en el mismo sitio
      // (sin CORS ni mixed content) y hace que funcione en los túneles de
      // Cloudflare, cuyo hostname cambia cada vez que se levanta cloudflared.
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${hostname}:8080`;
      }
      return window.location.origin;
    }
    return environment.keycloakUrl;
  }
}


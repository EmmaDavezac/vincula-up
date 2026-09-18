import { inject, Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, of, Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile, UserRole } from '../models/user-profile';

interface UsuarioLookupResponse {
  id: string;
  keycloakId: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fotoUrl?: string;
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
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isProfessionalActive = signal<boolean>(this.restoreProfActive());
  readonly loginError = signal('');

  constructor() {
    this.handleCodeCallback();
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
      catchError((error: HttpErrorResponse) => {
        this.loginError.set(this.describeError(error, 'No se pudo iniciar sesión con las credenciales indicadas.'));
        return of(false);
      }),
    );
  }

  logout(): void {
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PROF_ACTIVE_KEY);
    this.user.set(null);
    this.isProfessionalActive.set(false);

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
      .subscribe();
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
          } satisfies UserProfile;

          localStorage.setItem(TOKEN_KEY, token.access_token);
          if (token.id_token) localStorage.setItem(ID_TOKEN_KEY, token.id_token);
          this.persistProfile(profile);
          this.user.set(profile);
          if (profile.role === 'PROFESIONAL') {
            this.checkProfessionalStatus();
          }
          this.loginError.set('');
          return true;
        }),
        catchError(() => {
          const profile = {
            id: claims.sub ?? '',
            name: claims.name ?? 'Usuario Vincula-UP',
            role: claims.role as UserRole,
            roleLabel: this.roleLabel(claims.role as UserRole),
          } satisfies UserProfile;

          localStorage.setItem(TOKEN_KEY, token.access_token);
          if (token.id_token) localStorage.setItem(ID_TOKEN_KEY, token.id_token);
          this.persistProfile(profile);
          this.user.set(profile);
          if (profile.role === 'PROFESIONAL') {
            this.checkProfessionalStatus();
          }
          this.loginError.set('');
          return of(true);
        }),
      );
    } catch {
      this.loginError.set('No se pudo procesar la respuesta real de Keycloak.');
      return of(false);
    }
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
          return parsed;
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
    };
  }

  private restoreProfActive(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(PROF_ACTIVE_KEY) === 'true';
  }

  checkProfessionalStatus(): void {
    this.loadProfessionalStatus().subscribe();
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
      if (window.location.hostname === 'vincula-up.local') {
        return window.location.origin;
      }
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://${window.location.hostname}:8080`;
      }
    }
    return environment.keycloakUrl;
  }
}


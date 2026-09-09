import { inject, Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, of, Observable, switchMap } from 'rxjs';
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
const KEYCLOAK_STATE_KEY = 'vincula-up-keycloak-state';
const KEYCLOAK_NONCE_KEY = 'vincula-up-keycloak-nonce';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<UserProfile | null>(this.restoreSession());
  private readonly http = inject(HttpClient);
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly loginError = signal('');

  constructor() {
    this.handleCodeCallback();
  }

  loginWithKeycloak(): Observable<boolean> {
    this.loginError.set('');
    const state = this.randomValue();
    const nonce = this.randomValue();
    sessionStorage.setItem(KEYCLOAK_STATE_KEY, state);
    sessionStorage.setItem(KEYCLOAK_NONCE_KEY, nonce);

    const params = new URLSearchParams({
      client_id: environment.keycloakClientId,
      response_type: 'code',
      redirect_uri: environment.keycloakRedirectUri,
      scope: 'openid profile email',
      state,
      nonce,
      response_mode: 'query',
    });

    const authorizeUrl = `${environment.keycloakUrl}/realms/${environment.keycloakRealm}/protocol/openid-connect/auth?${params.toString()}`;
    window.location.href = authorizeUrl;
    return of(true);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
  }

  refreshSession(): void {
    this.user.set(this.restoreSession());
  }

  hasRole(role: UserRole): boolean {
    return this.user()?.role === role;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
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

    this.loginError.set('');
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', environment.keycloakClientId)
      .set('code', code)
      .set('redirect_uri', environment.keycloakRedirectUri)
      .set('scope', 'openid profile email');

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    this.http.post<KeycloakTokenResponse>(`${environment.keycloakUrl}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`, body.toString(), { headers })
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
        this.loginError.set('La respuesta de Keycloak no incluye la sesión necesaria para Vincula-UP.');
        return of(false);
      }

      const lookupUrl = `${environment.apiUrl}/usuarios/por-keycloak?keycloakId=${encodeURIComponent(claims.sub)}`;
      return this.http.get<UsuarioLookupResponse>(lookupUrl).pipe(
        map((usuario) => {
          const profile = {
            id: usuario.id,
            name: `${usuario.nombre} ${usuario.apellido}`.trim(),
            role: usuario.rolNegocio,
            roleLabel: this.roleLabel(usuario.rolNegocio),
          } satisfies UserProfile;

          const localJwt = this.buildToken(profile);
          localStorage.setItem(TOKEN_KEY, localJwt);
          this.user.set(profile);
          this.loginError.set('');
          return true;
        }),
        catchError((error: HttpErrorResponse) => {
          this.loginError.set(this.describeError(error, 'No se pudo vincular el usuario de Keycloak con Vincula-UP.'));
          return of(false);
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
      return null;
    }

    const payload = this.decodeToken(token);
    if (!payload || !payload.role || !this.isValidRole(payload.role)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }

    return {
      id: payload.sub ?? '',
      name: payload.name ?? 'Usuario Vincula-UP',
      role: payload.role,
      roleLabel: this.roleLabel(payload.role),
    };
  }

  private decodeToken(token: string): { sub?: string; name?: string; role?: UserRole } | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }
      const payload = parts[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      const role = decoded.role ?? decoded.realm_access?.roles?.[0] ?? decoded.roles?.[0];
      return { sub: decoded.sub, name: decoded.name ?? decoded.preferred_username, role: this.isValidRole(role) ? role : undefined };
    } catch {
      return null;
    }
  }

  private buildToken(profile: UserProfile): string {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = {
      sub: profile.id,
      name: profile.name,
      role: profile.role,
      roles: [profile.role],
      realm_access: { roles: [profile.role] },
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    return `${header}.${btoa(JSON.stringify(payload))}.signature`;
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
}

import { inject, Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, Observable } from 'rxjs';
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

const DEMO_USERS: Record<UserRole, UserProfile> = {
  CLIENTE: { id: '00000000-0000-0000-0000-000000000001', name: 'Sofia Gomez', role: 'CLIENTE', roleLabel: 'Cliente' },
  PROFESIONAL: { id: '00000000-0000-0000-0000-000000000002', name: 'Luciano Benitez', role: 'PROFESIONAL', roleLabel: 'Profesional' },
  ADMIN: { id: '00000000-0000-0000-0000-000000000003', name: 'Admin Vincula-UP', role: 'ADMIN', roleLabel: 'Administrador' },
};

const TOKEN_KEY = 'vincula-up-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<UserProfile | null>(this.restoreSession());
  private readonly http = inject(HttpClient);
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly loginError = signal('');

  login(role: UserRole): Observable<boolean> {
    const profile = DEMO_USERS[role];
    const keycloakId = profile.id;
    this.loginError.set('');

    return this.http.get<UsuarioLookupResponse>(`${environment.apiUrl}/usuarios/por-keycloak?keycloakId=${encodeURIComponent(keycloakId)}`).pipe(
      map((usuario) => {
        const mapped = {
          id: usuario.id,
          name: `${usuario.nombre} ${usuario.apellido}`.trim(),
          role: usuario.rolNegocio,
          roleLabel: this.roleLabel(usuario.rolNegocio),
        } satisfies UserProfile;

        const token = this.buildToken(mapped);
        localStorage.setItem(TOKEN_KEY, token);
        this.user.set(mapped);
        return true;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.useDemoProfile(profile);
          return of(true);
        }

        this.loginError.set(this.describeError(error, 'No se pudo validar tu usuario en Vincula-UP.'));
        return of(false);
      }),
    );
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

  private useDemoProfile(profile: UserProfile): void {
    const token = this.buildToken(profile);
    localStorage.setItem(TOKEN_KEY, token);
    this.user.set(profile);
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
      id: payload.sub ?? DEMO_USERS[payload.role].id,
      name: payload.name ?? DEMO_USERS[payload.role].name,
      role: payload.role,
      roleLabel: DEMO_USERS[payload.role].roleLabel,
    };
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

  private decodeToken(token: string): { sub?: string; name?: string; role?: UserRole } | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) {
        return null;
      }
      const decoded = JSON.parse(atob(payload));
      const role = decoded.role ?? decoded.realm_access?.roles?.[0] ?? decoded.roles?.[0];
      return { sub: decoded.sub, name: decoded.name, role: this.isValidRole(role) ? role : undefined };
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
}

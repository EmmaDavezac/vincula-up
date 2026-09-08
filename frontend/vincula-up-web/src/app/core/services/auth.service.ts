import { Injectable, computed, signal } from '@angular/core';
import { UserProfile, UserRole } from '../models/user-profile';

const DEMO_USERS: Record<UserRole, UserProfile> = {
  CLIENTE: { id: '00000000-0000-0000-0000-000000000001', name: 'Sofia Gomez', role: 'CLIENTE', roleLabel: 'Cliente' },
  PROFESIONAL: { id: '00000000-0000-0000-0000-000000000002', name: 'Luciano Benitez', role: 'PROFESIONAL', roleLabel: 'Profesional' },
  ADMIN: { id: '00000000-0000-0000-0000-000000000003', name: 'Admin Vincula-UP', role: 'ADMIN', roleLabel: 'Administrador' },
};

const TOKEN_KEY = 'vincula-up-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<UserProfile | null>(this.restoreSession());
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  login(role: UserRole): void {
    const profile = DEMO_USERS[role];
    const token = this.buildToken(profile);
    localStorage.setItem(TOKEN_KEY, token);
    this.user.set(profile);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
  }

  hasRole(role: UserRole): boolean {
    return this.user()?.role === role;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
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

  private isValidRole(role: string): role is UserRole {
    return role === 'CLIENTE' || role === 'PROFESIONAL' || role === 'ADMIN';
  }
}

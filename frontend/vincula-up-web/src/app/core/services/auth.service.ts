import { Injectable, computed, signal } from '@angular/core';
import { UserProfile, UserRole } from '../models/user-profile';

const DEMO_USERS: Record<UserRole, UserProfile> = {
  CLIENTE: { id: 'cliente-demo', name: 'Sofia Gomez', role: 'CLIENTE', roleLabel: 'Cliente' },
  PROFESIONAL: { id: 'profesional-demo', name: 'Luciano Benitez', role: 'PROFESIONAL', roleLabel: 'Profesional' },
  ADMIN: { id: 'admin-demo', name: 'Admin Vincula-UP', role: 'ADMIN', roleLabel: 'Administrador' },
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<UserProfile | null>(null);
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  login(role: UserRole): void {
    this.user.set(DEMO_USERS[role]);
  }

  logout(): void {
    this.user.set(null);
  }

  hasRole(role: UserRole): boolean {
    return this.user()?.role === role;
  }
}

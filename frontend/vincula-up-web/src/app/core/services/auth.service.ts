import { Injectable, computed, signal } from '@angular/core';
import { UserProfile, UserRole } from '../models/user-profile';

const DEMO_USERS: Record<UserRole, UserProfile> = {
  CLIENTE: { id: '00000000-0000-0000-0000-000000000001', name: 'Sofia Gomez', role: 'CLIENTE', roleLabel: 'Cliente' },
  PROFESIONAL: { id: '00000000-0000-0000-0000-000000000002', name: 'Luciano Benitez', role: 'PROFESIONAL', roleLabel: 'Profesional' },
  ADMIN: { id: '00000000-0000-0000-0000-000000000003', name: 'Admin Vincula-UP', role: 'ADMIN', roleLabel: 'Administrador' },
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

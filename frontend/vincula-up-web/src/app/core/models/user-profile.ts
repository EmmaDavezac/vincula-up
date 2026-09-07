export type UserRole = 'CLIENTE' | 'PROFESIONAL' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
}

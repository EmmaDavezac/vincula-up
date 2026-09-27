export type UserRole = 'CLIENTE' | 'PROFESIONAL' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  /**
   * Foto de perfil real (data URL subida en "Mi cuenta"). No viaja en el token de
   * Keycloak: se consulta una vez por sesión contra /api/usuarios/yo, así que
   * puede venir vacía hasta que esa consulta responda.
   */
  fotoUrl?: string | null;
}

export type UserRole = 'CLIENTE' | 'PROFESIONAL' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  /**
   * Si la persona con sesión tiene foto de perfil. La foto no viaja en el token ni
   * como URL: el backend la entrega en `GET /api/usuarios/{id}/foto`, que exige
   * sesión y controla la visibilidad por rol. Acá solo queda el dato de si hay
   * algo que pedir; la imagen la resuelve el `FotoService`.
   */
  tieneFoto: boolean;
}

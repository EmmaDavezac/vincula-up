export interface Professional {
  id: string;
  name: string;
  specialty: string;
  zone: string;
  rating: number;
  reviews: number;
  availability: string;
  initials: string;
  accent: string;
  usuarioId?: string;
  legajo?: string;
  nombre?: string | null;
  apellido?: string | null;
  especialidades?: Array<{ id: string; nombre: string }>;
  zonaCoberturaLat?: number | null;
  zonaCoberturaLng?: number | null;
  radioKm?: number | null;
  /**
   * Si el profesional tiene foto de perfil. La imagen no viaja como URL: el
   * `vu-avatar` la pide por `/api/usuarios/{usuarioId}/foto`, que exige sesión y
   * controla la visibilidad por rol.
   */
  tieneFoto?: boolean;
  /** Recurso local de respaldo cuando el perfil de demostración no tiene foto subida. */
  avatarFallback?: string | null;
  estado?: string;
  /** Horarios de disponibilidad del profesional, si los provee el backend. */
  horarios?: Array<{ diaSemana: number | string; horaInicio: string; horaFin: string }>;
}

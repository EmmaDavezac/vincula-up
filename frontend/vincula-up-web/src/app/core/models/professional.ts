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
  fotoUrl?: string | null;
  estado?: string;
}

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
  legajo?: string;
  especialidades?: Array<{ id: string; nombre: string }>;
  zonaCoberturaLat?: number | null;
  zonaCoberturaLng?: number | null;
}

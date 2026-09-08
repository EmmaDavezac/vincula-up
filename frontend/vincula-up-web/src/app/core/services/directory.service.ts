import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiService } from './api.service';
import { Professional } from '../models/professional';

const PROFESSIONALS: Professional[] = [
  {
    id: 'demo-1',
    name: 'Luciano Benitez',
    specialty: 'Electricidad domiciliaria',
    zone: 'Concepcion del Uruguay',
    rating: 4.9,
    reviews: 28,
    availability: 'Hoy, de 15 a 19 h',
    initials: 'LB',
    accent: 'mint',
  },
  {
    id: 'demo-2',
    name: 'Mariana Acosta',
    specialty: 'Plomeria y gas',
    zone: 'Concepcion del Uruguay',
    rating: 4.8,
    reviews: 19,
    availability: 'Manana, de 9 a 13 h',
    initials: 'MA',
    accent: 'sun',
  },
  {
    id: 'demo-3',
    name: 'Jorge Sosa',
    specialty: 'Refrigeracion',
    zone: 'Colon y alrededores',
    rating: 4.7,
    reviews: 14,
    availability: 'Hoy, de 17 a 20 h',
    initials: 'JS',
    accent: 'sky',
  },
  {
    id: 'demo-4',
    name: 'Camila Ramirez',
    specialty: 'Reparacion de electrodomesticos',
    zone: 'Concepcion del Uruguay',
    rating: 5,
    reviews: 11,
    availability: 'Jueves, de 10 a 16 h',
    initials: 'CR',
    accent: 'rose',
  },
];

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  constructor(private readonly api: ApiService) {}

  getProfessionals(): Professional[] {
    return PROFESSIONALS;
  }

  loadProfessionals(): Observable<Professional[]> {
    return this.api.getProfessionals().pipe(
      map((professionals) => professionals.map((professional, index) => ({
        id: professional.id,
        name: `Profesional ${professional.legajo ?? professional.id.slice(0, 8)}`,
        specialty: professional.especialidades?.map((specialty) => specialty.nombre).join(' / ') || 'Servicio técnico',
        zone: professional.zonaCoberturaLat != null && professional.zonaCoberturaLng != null
          ? 'Zona de cobertura activa'
          : 'Zona no informada',
        rating: 0,
        reviews: 0,
        availability: 'Consultar disponibilidad',
        initials: `P${index + 1}`,
        accent: ['mint', 'sun', 'sky', 'rose'][index % 4],
      }))),
      catchError(() => of(PROFESSIONALS)),
    );
  }
}

import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Professional } from '../models/professional';

const PROFESSIONALS: Professional[] = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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
    id: 4,
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

  loadProfessionals() {
    return this.api.getProfessionals();
  }
}

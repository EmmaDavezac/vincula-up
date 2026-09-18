import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { Professional } from '../models/professional';

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private professionals: Professional[] = [];

  constructor(private readonly api: ApiService) {}

  getProfessionals(): Professional[] {
    return this.professionals;
  }

  loadProfessionals(todos = false): Observable<Professional[]> {
    return this.api.getProfessionals(undefined, todos).pipe(
      map((professionals) => professionals.filter((professional) => todos || professional.estado === 'ACTIVO')),
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
        usuarioId: professional.usuarioId,
        legajo: professional.legajo,
        especialidades: professional.especialidades,
        zonaCoberturaLat: professional.zonaCoberturaLat,
        zonaCoberturaLng: professional.zonaCoberturaLng,
        radioKm: professional.radioKm,
        fotoUrl: professional.fotoUrl,
        estado: professional.estado ?? 'ACTIVO',
      }))),
      map((professionals) => {
        this.professionals = professionals;
        return professionals;
      }),
      catchError((error) => {
        this.professionals = [];
        return throwError(() => error);
      }),
    );
  }
}

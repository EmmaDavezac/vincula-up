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
      map((professionals) => professionals.map((professional, index) => {
        const fallbackName = `Profesional ${professional.legajo ?? professional.id.slice(0, 8)}`;
        const realName = [professional.nombre, professional.apellido]
          .filter((parte) => typeof parte === 'string' && parte.trim().length > 0)
          .map((parte) => (parte as string).trim())
          .join(' ');
        const name = realName || fallbackName;
        const initials = realName
          ? realName.split(/\s+/).slice(0, 2).map((parte) => parte.charAt(0).toUpperCase()).join('')
          : `P${index + 1}`;
        return {
          id: professional.id,
          name,
          specialty: professional.especialidades?.map((specialty) => specialty.nombre).join(' / ') || 'Servicio técnico',
          zone: professional.zonaCoberturaLat != null && professional.zonaCoberturaLng != null
            ? 'Zona de cobertura activa'
            : 'Zona no informada',
          // Reputación real que calcula el backend (promedio y cantidad de reseñas).
          rating: professional.rating,
          reviews: professional.reviews,
          availability: 'Consultar disponibilidad',
          initials,
          accent: ['mint', 'sun', 'sky', 'rose'][index % 4],
          usuarioId: professional.usuarioId,
          legajo: professional.legajo,
          nombre: professional.nombre ?? null,
          apellido: professional.apellido ?? null,
          especialidades: professional.especialidades,
          zonaCoberturaLat: professional.zonaCoberturaLat,
          zonaCoberturaLng: professional.zonaCoberturaLng,
          radioKm: professional.radioKm,
          tieneFoto: professional.tieneFoto === true,
          estado: professional.estado ?? 'ACTIVO',
        };
      })),
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

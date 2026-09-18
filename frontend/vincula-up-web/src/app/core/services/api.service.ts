import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Professional } from '../models/professional';
import { RequestStatus, ServiceRequest } from '../models/service-request';
import { AuthService } from './auth.service';

interface BackendRequest {
  id: string;
  clienteId: string;
  profesionalId: string;
  especialidadId: string;
  direccionServicio: string;
  fechaHoraPropuesta: string;
  estado: RequestStatus | string;
  motivoCancelacion?: string;
  fechaCreacion: string;
  fechaCambioEstado: string;
  latitud?: number | null;
  longitud?: number | null;
}

export interface ClienteInfo {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fotoUrl?: string;
  fechaAlta?: string;
}

interface ProfessionalActivationResponse {
  id?: string;
  usuarioId?: string;
  legajo?: string;
  estado?: string;
}

interface AvailabilitySlot {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

export interface GpsPosition {
  address: string;
  latitude: number | null;
  longitude: number | null;
  latitud?: number | null;
  longitud?: number | null;
  source: string;
  resolved?: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  getProfessionals(status = 'ACTIVO', todos = false): Observable<Professional[]> {
    let params = new HttpParams();
    if (todos) {
      params = params.set('todos', 'true');
    } else if (status) {
      params = params.set('estado', status);
    }
    return this.http.get<Professional[]>(`${this.baseUrl}/profesionales`, { params, headers: this.authHeaders() });
  }

  saveSpecialty(id: string | null, nombre: string): Observable<unknown> {
    const options = { headers: this.authHeaders() };
    return id ? this.http.put(`${this.baseUrl}/especialidades/${id}`, { nombre }, options)
      : this.http.post(`${this.baseUrl}/especialidades`, { nombre }, options);
  }

  deleteSpecialty(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/especialidades/${id}`, { headers: this.authHeaders() });
  }

  updateProfessional(id: string, request: { usuarioId: string; legajo: string; especialidadIds: string[] }): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/profesionales/${id}`, request, { headers: this.authHeaders() });
  }

  deleteProfessional(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/profesionales/${id}`, { headers: this.authHeaders() });
  }

  saveUser(id: string | null, request: { keycloakId: string; nombre: string; apellido: string; email: string; telefono: string; rolNegocio: string }): Observable<unknown> {
    const options = { headers: this.authHeaders() };
    return id ? this.http.patch(`${this.baseUrl}/usuarios/${id}`, request, options)
      : this.http.post(`${this.baseUrl}/usuarios`, request, options);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/usuarios/${id}`, { headers: this.authHeaders() });
  }

  getSpecialties(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/especialidades`, { headers: this.authHeaders() });
  }

  createProfessional(request: {
    usuarioId: string;
    legajo: string;
    especialidadIds: string[];
  }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/profesionales`, request, { headers: this.authHeaders() });
  }

  activateProfessional(request: {
    usuarioId: string;
    keycloakId?: string;
    fotoUrl: string;
    zonaCoberturaLat: number;
    zonaCoberturaLng: number;
    radioKm: number;
  }): Observable<ProfessionalActivationResponse> {
    return this.http.patch<ProfessionalActivationResponse>(`${this.baseUrl}/profesionales/activar`, request, { headers: this.authHeaders() });
  }

  getMyProfessionalProfile(usuarioId: string, keycloakId?: string | null): Observable<ProfessionalActivationResponse | null> {
    let params = new HttpParams().set('usuarioId', usuarioId);
    if (keycloakId) {
      params = params.set('keycloakId', keycloakId);
    }
    return this.http.get<ProfessionalActivationResponse>(`${this.baseUrl}/profesionales/mi-perfil`, {
      params,
      headers: this.authHeaders(),
    }).pipe(
      catchError(() => of(null)),
    );
  }

  setAvailability(professionalId: string, slots: AvailabilitySlot[]): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/profesionales/${professionalId}/disponibilidad`, slots, { headers: this.authHeaders() });
  }

  suspendProfessional(id: string): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/profesionales/${id}/suspender`, {}, { headers: this.authHeaders() });
  }

  reactivateProfessional(id: string): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/profesionales/${id}/reactivar`, {}, { headers: this.authHeaders() });
  }

  getUsers(role?: string): Observable<Array<{ id: string; nombre: string; apellido: string; email: string; rolNegocio: string }>> {
    let params = new HttpParams();
    if (role) {
      params = params.set('rol', role);
    }
    return this.http.get<Array<{ id: string; nombre: string; apellido: string; email: string; rolNegocio: string }>>(`${this.baseUrl}/usuarios`, { params, headers: this.authHeaders() });
  }

  getUserById(id: string): Observable<ClienteInfo | null> {
    if (!id) return of(null);
    return this.http.get<ClienteInfo>(`${this.baseUrl}/usuarios/${id}`, { headers: this.authHeaders() });
  }

  getSpecialtiesMap(): Observable<Record<string, string>> {
    return this.http.get<Array<{ id: string; nombre: string }>>(`${this.baseUrl}/especialidades`, { headers: this.authHeaders() }).pipe(
      map((items) => {
        const m: Record<string, string> = {};
        for (const it of items ?? []) {
          if (it?.id && it?.nombre) m[it.id] = it.nombre;
        }
        return m;
      }),
    );
  }

  getAvailability(professionalId: string): Observable<AvailabilitySlot[]> {
    return this.http.get<AvailabilitySlot[]>(`${this.baseUrl}/profesionales/${professionalId}/disponibilidad`, { headers: this.authHeaders() });
  }

  createRequest(request: {
    clienteId: string;
    profesionalId: string;
    especialidadId: string;
    direccionServicio: string;
    latitud: number;
    longitud: number;
    fechaHoraPropuesta: string;
  }): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.baseUrl}/solicitudes`, request, { headers: this.authHeaders() });
  }

  getMyRequests(
    userId: string,
    options?: { aliasIds?: string[]; tipo?: 'RECIBIDAS' | 'ENVIADAS'; rol?: string },
  ): Observable<ServiceRequest[]> {
    let params = new HttpParams().set('usuarioId', userId);
    if (options?.tipo) {
      params = params.set('tipo', options.tipo);
    }
    if (options?.rol) {
      params = params.set('rol', options.rol);
    }
    if (options?.aliasIds && options.aliasIds.length > 0) {
      for (const alias of options.aliasIds) {
        if (alias) {
          params = params.append('aliasIds', alias);
        }
      }
    }
    return this.http.get<BackendRequest[]>(`${this.baseUrl}/solicitudes/mias`, { params, headers: this.authHeaders() }).pipe(
      map((items) => items.map((item) => this.toServiceRequest(item))),
    );
  }

  acceptRequest(requestId: string, actorId: string, motivo = ''): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.baseUrl}/solicitudes/${requestId}/aceptar`, { actorId, motivo }, { headers: this.authHeaders() }).pipe(
      map((request) => this.toServiceRequest(request)),
    );
  }

  rejectRequest(requestId: string, actorId: string, motivo = ''): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.baseUrl}/solicitudes/${requestId}/rechazar`, { actorId, motivo }, { headers: this.authHeaders() }).pipe(
      map((request) => this.toServiceRequest(request)),
    );
  }

  completeRequest(requestId: string, actorId: string): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.baseUrl}/solicitudes/${requestId}/completar`, { actorId }, { headers: this.authHeaders() }).pipe(
      map((request) => this.toServiceRequest(request)),
    );
  }

  cancelRequest(requestId: string, actorId: string, motivo = ''): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.baseUrl}/solicitudes/${requestId}/cancelar`, { actorId, motivo }, { headers: this.authHeaders() }).pipe(
      map((request) => this.toServiceRequest(request)),
    );
  }

  createRating(requestId: string, clienteId: string, puntaje: number, comentario = ''): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/solicitudes/${requestId}/calificacion`, { clienteId, puntaje, comentario }, { headers: this.authHeaders() });
  }

  getRating(requestId: string): Observable<{ id: string; solicitudId: string; puntaje: number; comentario: string } | null> {
    return this.http.get<{ id: string; solicitudId: string; puntaje: number; comentario: string }>(`${this.baseUrl}/solicitudes/${requestId}/calificacion`, { headers: this.authHeaders() });
  }

  getGpsPosition(address = ''): Observable<GpsPosition> {
    const params = new HttpParams().set('direccion', address);
    return this.http.get<GpsPosition>(`${this.baseUrl}/gps`, { params, headers: this.authHeaders() });
  }

  getMessages(requestId: string, userId: string): Observable<unknown[]> {
    const params = new HttpParams().set('usuarioId', userId);
    return this.http.get<unknown[]>(`${this.baseUrl}/solicitudes/${requestId}/mensajes`, { params, headers: this.authHeaders() });
  }

  sendMessage(requestId: string, message: { emisorId: string; texto: string }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/solicitudes/${requestId}/mensajes`, message, { headers: this.authHeaders() });
  }

  describeError(error: unknown, fallback = 'No se pudo completar la operación.'): string {
    const status = typeof error === 'object' && error
      ? Number((error as { status?: number | string }).status ?? 0)
      : 0;

    const rawMessage = typeof error === 'object' && error
      ? String((error as { message?: string }).message ?? '')
      : '';

    const errorPayload = typeof error === 'object' && error && 'error' in error
      ? (error as { error?: { message?: string; status?: number | string; error?: string } }).error
      : undefined;

    const nestedMessage = typeof errorPayload === 'object' && errorPayload && 'message' in errorPayload
      ? String((errorPayload as { message?: string }).message ?? '')
      : '';

    const payloadError = typeof errorPayload === 'object' && errorPayload && 'error' in errorPayload
      ? String((errorPayload as { error?: string }).error ?? '')
      : '';

    const message = rawMessage
      .replace(/^Http failure response for .*?:\s*/i, '')
      .replace(/\bNot Found\b/i, 'No encontrado')
      .replace(/\bUnauthorized\b/i, 'No autorizado')
      .replace(/\bForbidden\b/i, 'Prohibido')
      .replace(/\bConflict\b/i, 'Conflicto')
      || nestedMessage || payloadError || '';

    if (status === 403 || /forbidden|denied|permiso|prohibido/i.test(message)) {
      return 'No tenés permiso para realizar esta acción.';
    }
    if (status === 404 || /no encontrado|not found|resource/i.test(message)) {
      return 'La solicitud o el recurso ya no está disponible.';
    }
    if (status === 409 || /conflict|estado|ya está en un estado/i.test(message)) {
      return 'La solicitud ya está en un estado distinto y no se puede mover ahora.';
    }
    if (status === 401 || /no autorizado|unauthorized|login|sesion/i.test(message)) {
      return 'Necesitás volver a iniciar sesión para continuar.';
    }
    if (message) {
      return message.charAt(0).toUpperCase() + message.slice(1);
    }
    return fallback;
  }

  private toServiceRequest(request: Partial<BackendRequest> | ServiceRequest): ServiceRequest {
    const backend = request as Partial<BackendRequest>;
    const prev = request as ServiceRequest;
    return {
      id: backend.id ?? prev.id ?? Date.now(),
      clienteId: backend.clienteId ?? prev.clienteId,
      professionalId: backend.profesionalId ?? prev.professionalId ?? '',
      professionalName: prev.professionalName ?? 'Profesional Vincula-UP',
      specialty: prev.specialty ?? 'Servicio técnico',
      date: backend.fechaHoraPropuesta ? this.parseDate(backend.fechaHoraPropuesta) : prev.date ?? '',
      time: backend.fechaHoraPropuesta ? this.parseTime(backend.fechaHoraPropuesta) : prev.time ?? '',
      address: backend.direccionServicio ?? prev.address ?? '',
      latitude: backend.latitud != null ? Number(backend.latitud) : prev.latitude ?? null,
      longitude: backend.longitud != null ? Number(backend.longitud) : prev.longitude ?? null,
      status: this.normalizeStatus(backend.estado ?? prev.status ?? 'PENDIENTE'),
      motivoCancelacion: backend.motivoCancelacion ?? prev.motivoCancelacion,
      especialidadId: backend.especialidadId ?? prev.especialidadId,
      fechaCreacion: backend.fechaCreacion ?? prev.fechaCreacion,
      fechaCambioEstado: backend.fechaCambioEstado ?? prev.fechaCambioEstado,
    };
  }

  private normalizeStatus(value: RequestStatus | string): RequestStatus {
    const normalized = String(value ?? 'PENDIENTE').toUpperCase();
    if (normalized === 'ACEPTADA' || normalized === 'RECHAZADA' || normalized === 'COMPLETADA' || normalized === 'CANCELADA' || normalized === 'VENCIDA' || normalized === 'PENDIENTE') {
      return normalized as RequestStatus;
    }
    return 'PENDIENTE';
  }

  private parseDate(value?: string): string {
    if (!value) {
      return '';
    }
    const date = value.split('T')[0];
    return date ?? '';
  }

  private parseTime(value?: string): string {
    if (!value) {
      return '';
    }
    const time = value.split('T')[1]?.slice(0, 5);
    return time ?? '';
  }
}

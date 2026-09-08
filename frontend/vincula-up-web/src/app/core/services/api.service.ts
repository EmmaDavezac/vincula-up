import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  fechaCreacion: string;
  fechaCambioEstado: string;
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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  getProfessionals(status = 'ACTIVO'): Observable<Professional[]> {
    const params = new HttpParams().set('estado', status);
    return this.http.get<Professional[]>(`${this.baseUrl}/profesionales`, { params, headers: this.authHeaders() });
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
    fotoUrl: string;
    zonaCoberturaLat: number;
    zonaCoberturaLng: number;
    radioKm: number;
  }): Observable<ProfessionalActivationResponse> {
    return this.http.patch<ProfessionalActivationResponse>(`${this.baseUrl}/profesionales/activar`, request, { headers: this.authHeaders() });
  }

  setAvailability(professionalId: string, slots: AvailabilitySlot[]): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/profesionales/${professionalId}/disponibilidad`, slots, { headers: this.authHeaders() });
  }

  suspendProfessional(id: string): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/profesionales/${id}/suspender`, {}, { headers: this.authHeaders() });
  }

  createRequest(request: {
    clienteId: string;
    profesionalId: string;
    especialidadId: string;
    direccionServicio: string;
    fechaHoraPropuesta: string;
  }): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.baseUrl}/solicitudes`, request, { headers: this.authHeaders() });
  }

  getMyRequests(userId: string): Observable<ServiceRequest[]> {
    const params = new HttpParams().set('usuarioId', userId);
    return this.http.get<BackendRequest[]>(`${this.baseUrl}/solicitudes/mias`, { params, headers: this.authHeaders() }).pipe(
      map((items) => items.map((item) => ({
        id: item.id,
        professionalId: item.profesionalId,
        professionalName: 'Profesional Vincula-UP',
        specialty: 'Servicio técnico',
        date: this.parseDate(item.fechaHoraPropuesta),
        time: this.parseTime(item.fechaHoraPropuesta),
        address: item.direccionServicio,
        status: this.normalizeStatus(item.estado),
      }))),
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
    return {
      id: backend.id ?? (request as ServiceRequest).id ?? Date.now(),
      professionalId: backend.profesionalId ?? (request as ServiceRequest).professionalId ?? '',
      professionalName: (request as ServiceRequest).professionalName ?? 'Profesional Vincula-UP',
      specialty: (request as ServiceRequest).specialty ?? 'Servicio técnico',
      date: backend.fechaHoraPropuesta ? this.parseDate(backend.fechaHoraPropuesta) : (request as ServiceRequest).date ?? '',
      time: backend.fechaHoraPropuesta ? this.parseTime(backend.fechaHoraPropuesta) : (request as ServiceRequest).time ?? '',
      address: backend.direccionServicio ?? (request as ServiceRequest).address ?? '',
      status: this.normalizeStatus(backend.estado ?? (request as ServiceRequest).status ?? 'PENDIENTE'),
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

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Professional } from '../models/professional';
import { ServiceRequest } from '../models/service-request';
import { AuthService } from './auth.service';

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
    return this.http.get<ServiceRequest[]>(`${this.baseUrl}/solicitudes/mias`, { params, headers: this.authHeaders() });
  }

  getMessages(requestId: string, userId: string): Observable<unknown[]> {
    const params = new HttpParams().set('usuarioId', userId);
    return this.http.get<unknown[]>(`${this.baseUrl}/solicitudes/${requestId}/mensajes`, { params, headers: this.authHeaders() });
  }

  sendMessage(requestId: string, message: { emisorId: string; texto: string }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/solicitudes/${requestId}/mensajes`, message, { headers: this.authHeaders() });
  }
}

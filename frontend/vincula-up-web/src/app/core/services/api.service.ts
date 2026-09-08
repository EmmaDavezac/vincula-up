import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Professional } from '../models/professional';
import { ServiceRequest } from '../models/service-request';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getProfessionals(status = 'ACTIVO'): Observable<Professional[]> {
    const params = new HttpParams().set('estado', status);
    return this.http.get<Professional[]>(`${this.baseUrl}/profesionales`, { params });
  }

  getSpecialties(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/especialidades`);
  }

  createRequest(request: Omit<ServiceRequest, 'id' | 'status'>): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.baseUrl}/solicitudes`, request);
  }

  getMyRequests(userId: string): Observable<ServiceRequest[]> {
    const params = new HttpParams().set('usuarioId', userId);
    return this.http.get<ServiceRequest[]>(`${this.baseUrl}/solicitudes/mias`, { params });
  }

  getMessages(requestId: string, userId: string): Observable<unknown[]> {
    const params = new HttpParams().set('usuarioId', userId);
    return this.http.get<unknown[]>(`${this.baseUrl}/solicitudes/${requestId}/mensajes`, { params });
  }

  sendMessage(requestId: string, message: { emisorId: string; texto: string }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/solicitudes/${requestId}/mensajes`, message);
  }
}

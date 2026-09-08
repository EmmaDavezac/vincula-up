import { Injectable, signal } from '@angular/core';
import { RequestStatus, ServiceRequest } from '../models/service-request';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly requests = signal<ServiceRequest[]>([]);
  readonly myRequests = this.requests.asReadonly();

  create(request: Omit<ServiceRequest, 'id' | 'status'>): ServiceRequest {
    const created: ServiceRequest = {
      ...request,
      id: Date.now(),
      status: 'PENDIENTE',
    };
    this.requests.update((requests) => [...requests, created]);
    return created;
  }

  updateStatus(requestId: number | string, status: RequestStatus): void {
    this.requests.update((requests) => requests.map((request) =>
      String(request.id) === String(requestId) ? { ...request, status } : request,
    ));
  }

  replace(requests: ServiceRequest[]): void {
    this.requests.set(requests);
  }
}

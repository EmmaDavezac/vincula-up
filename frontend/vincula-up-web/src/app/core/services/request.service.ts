import { Injectable, signal } from '@angular/core';
import { ServiceRequest } from '../models/service-request';

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
}

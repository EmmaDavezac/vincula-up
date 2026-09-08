import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { RequestStatus, ServiceRequest } from '../core/models/service-request';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { RequestService } from '../core/services/request.service';

@Component({
  imports: [RouterLink],
  selector: 'app-my-requests',
  styleUrl: './my-requests.css',
  templateUrl: './my-requests.html',
})
export class MyRequests {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly requestService = inject(RequestService);
  readonly requests = this.requestService.myRequests;
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  constructor() {
    const userId = this.auth.currentUser()?.id;
    if (userId) {
      this.api.getMyRequests(userId).pipe(
        catchError((error) => {
          this.errorMessage.set(this.api.describeError(error, 'No se pudieron cargar tus solicitudes'));
          return of(null);
        }),
      ).subscribe((requests) => {
        if (requests) {
          this.requestService.replace(requests);
        }
      });
    }
  }

  accept(request: ServiceRequest): void {
    const actorId = this.auth.currentUser()?.id;
    if (!actorId) {
      this.errorMessage.set('Necesitás iniciar sesión para responder esta solicitud.');
      this.successMessage.set('');
      return;
    }
    this.errorMessage.set('');
    this.api.acceptRequest(String(request.id), actorId, '').pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo aceptar la solicitud'));
        this.successMessage.set('');
        return of(null);
      }),
    ).subscribe((updated) => {
      if (updated) {
        this.requestService.updateStatus(request.id, updated.status);
        this.successMessage.set('Solicitud aceptada. El profesional puede coordinar el servicio.');
      }
    });
  }

  reject(request: ServiceRequest): void {
    const actorId = this.auth.currentUser()?.id;
    if (!actorId) {
      this.errorMessage.set('Necesitás iniciar sesión para responder esta solicitud.');
      this.successMessage.set('');
      return;
    }
    this.errorMessage.set('');
    this.api.rejectRequest(String(request.id), actorId, 'Solicitud rechazada desde el panel de cliente').pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo rechazar la solicitud'));
        this.successMessage.set('');
        return of(null);
      }),
    ).subscribe((updated) => {
      if (updated) {
        this.requestService.updateStatus(request.id, updated.status);
        this.successMessage.set('Solicitud rechazada. Podés buscar otra opción de servicio.');
      }
    });
  }

  complete(request: ServiceRequest): void {
    const actorId = this.auth.currentUser()?.id;
    if (!actorId) {
      this.errorMessage.set('Necesitás iniciar sesión para completar esta solicitud.');
      this.successMessage.set('');
      return;
    }
    this.errorMessage.set('');
    this.api.completeRequest(String(request.id), actorId).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo completar la solicitud'));
        this.successMessage.set('');
        return of(null);
      }),
    ).subscribe((updated) => {
      if (updated) {
        this.requestService.updateStatus(request.id, updated.status);
        this.successMessage.set('La solicitud quedó completada y el servicio está cerrado.');
      }
    });
  }

  statusText(status: RequestStatus): string {
    return {
      PENDIENTE: 'Pendiente de respuesta',
      ACEPTADA: 'Aceptada por el profesional',
      RECHAZADA: 'Solicitud rechazada',
      COMPLETADA: 'Servicio completado',
      CANCELADA: 'Solicitud cancelada',
      VENCIDA: 'Solicitud vencida',
    }[status] ?? status;
  }

  nextAction(status: RequestStatus): string {
    return {
      PENDIENTE: 'Esperando respuesta del profesional',
      ACEPTADA: 'Coordiná fecha y horario con el profesional',
      RECHAZADA: 'Podés buscar otro profesional',
      COMPLETADA: 'Gracias por usar Vincula-UP',
      CANCELADA: 'La solicitud fue cancelada',
      VENCIDA: 'La solicitud venció sin respuesta',
    }[status] ?? 'Revisá el estado de esta solicitud';
  }
}

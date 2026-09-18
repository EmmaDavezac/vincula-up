import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { RequestStatus, ServiceRequest } from '../core/models/service-request';
import { ApiService, ClienteInfo } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { RequestService } from '../core/services/request.service';

interface MessageItem {
  id: string;
  solicitudId: string;
  emisorId: string;
  texto: string;
  fechaEnvio: string;
}

interface RatingItem {
  id?: string;
  solicitudId?: string;
  puntaje: number;
  comentario: string;
}

@Component({
  imports: [CommonModule, RouterLink, FormsModule],
  selector: 'app-my-requests',
  styleUrl: './my-requests.css',
  templateUrl: './my-requests.html',
})
export class MyRequests {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly requestService = inject(RequestService);

  readonly requests = this.requestService.myRequests;
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  // Chat state
  readonly activeChatId = signal<string | null>(null);
  readonly chatMessages = signal<Record<string, MessageItem[]>>({});
  readonly chatInput = signal('');
  readonly sendingChat = signal(false);

  // Reject modal/dialog state
  readonly rejectingRequestId = signal<string | null>(null);
  readonly rejectReason = signal('');

  // Rating state
  readonly ratings = signal<Record<string, RatingItem | null>>({});
  readonly ratingScore = signal<Record<string, number>>({});
  readonly ratingComment = signal<Record<string, string>>({});
  readonly submittingRating = signal(false);

  // Detalle enriquecido para el profesional: cliente + especialidad + mapa
  readonly clientes = signal<Record<string, ClienteInfo | null>>({});
  readonly especialidades = signal<Record<string, string>>({});
  readonly loadingSpecialties = signal(true);
  readonly specialtiesError = signal('');
  readonly detailOpen = signal<Record<string, boolean>>({});
  readonly showLocationMap = signal<string | null>(null);
  private locationMapInstance: any = null;
  private locationMapMarker: any = null;

  constructor() {
    this.reloadRequests();
    this.loadEspecialidades();
  }

  reloadRequests(): void {
    const userId = this.auth.currentUser()?.id;
    if (userId) {
      const isProf = this.isProfessional();
      const keycloakId = this.auth.getKeycloakId();
      const aliasIds = keycloakId && keycloakId !== userId ? [keycloakId] : [];

      const options = isProf
        ? { rol: 'PROFESIONAL', tipo: 'RECIBIDAS' as const, aliasIds }
        : { rol: 'CLIENTE', tipo: 'ENVIADAS' as const, aliasIds };

      this.api.getMyRequests(userId, options).pipe(
        catchError((error) => {
          this.errorMessage.set(this.api.describeError(error, 'No se pudieron cargar tus solicitudes'));
          return of(null);
        }),
      ).subscribe((requests) => {
        if (requests) {
          const filtered = isProf
            ? requests.filter((r) => r.clienteId !== userId)
            : requests;

          this.requestService.replace(filtered);
          for (const req of filtered) {
            if (req.status === 'COMPLETADA') {
              this.loadRating(String(req.id));
            }
            // Si soy profesional, traigo la ficha del cliente que hizo el pedido
            if (this.isProfessional() && req.clienteId) {
              this.loadCliente(req.clienteId);
            }
          }
        }
      });
    }
  }

  // ── Ficha del cliente (quién hace la solicitud) ──
  loadCliente(clienteId: string): void {
    if (!clienteId || this.clientes()[clienteId] !== undefined) return;
    // marco como pendiente para no repetir llamadas
    this.clientes.update((prev) => ({ ...prev, [clienteId]: null }));
    this.api.getUserById(clienteId).pipe(catchError(() => of(null))).subscribe((cliente) => {
      if (cliente) {
        this.clientes.update((prev) => ({ ...prev, [clienteId]: cliente }));
      }
    });
  }

  clienteDe(request: ServiceRequest): ClienteInfo | null {
    if (!request.clienteId) return null;
    return this.clientes()[request.clienteId] ?? null;
  }

  clienteNombre(request: ServiceRequest): string {
    const c = this.clienteDe(request);
    if (!c) return request.clienteId ? 'Cliente Vincula-UP' : 'Cliente';
    const full = `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim();
    return full || c.email || 'Cliente Vincula-UP';
  }

  // ── Especialidad (nombre real en vez de "Servicio técnico") ──
  loadEspecialidades(): void {
    this.loadingSpecialties.set(true);
    this.specialtiesError.set('');
    this.api.getSpecialtiesMap().pipe(catchError(() => {
      this.specialtiesError.set('No se pudieron cargar los nombres de las especialidades.');
      return of({} as Record<string, string>);
    })).subscribe((m) => {
      this.especialidades.set(m ?? {});
      this.loadingSpecialties.set(false);
    });
  }

  especialidadNombre(request: ServiceRequest): string {
    if (request.especialidadId && this.especialidades()[request.especialidadId]) {
      return this.especialidades()[request.especialidadId];
    }
    const name = request.specialty;
    const isCode = name === request.especialidadId || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(name || '')
      || /^Especialidad [0-9a-f]{8}/i.test(name || '');
    if (name && name !== 'Servicio técnico' && !isCode) return name;
    return this.loadingSpecialties() ? 'Cargando especialidad...' : 'Especialidad no disponible';
  }

  // ── Detalle expandible ──
  toggleDetail(requestId: string | number): void {
    const id = String(requestId);
    this.detailOpen.update((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  isDetailOpen(requestId: string | number): boolean {
    return !!this.detailOpen()[String(requestId)];
  }

  // ── Mapa de ubicación de la solicitud (Leaflet / OSM) ──
  hasCoords(request: ServiceRequest): boolean {
    return request.latitude != null && request.longitude != null;
  }

  coordsText(request: ServiceRequest): string {
    if (!this.hasCoords(request)) return 'Sin coordenadas';
    return `${Number(request.latitude).toFixed(5)}, ${Number(request.longitude).toFixed(5)}`;
  }

  googleMapsUrl(request: ServiceRequest): string {
    if (this.hasCoords(request)) {
      return `https://www.google.com/maps?q=${request.latitude},${request.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.address || '')}`;
  }

  openLocationMap(request: ServiceRequest): void {
    if (!this.hasCoords(request)) return;
    this.showLocationMap.set(String(request.id));
    this.scheduleLocationMapInit(request, 0);
  }

  /** Espera a que Angular renderice el contenedor del modal antes de crear el mapa. */
  private scheduleLocationMapInit(request: ServiceRequest, attempt: number): void {
    setTimeout(() => {
      if (!document.getElementById('request-location-map')) {
        if (attempt < 10) {
          this.scheduleLocationMapInit(request, attempt + 1);
        }
        return;
      }
      this.initLocationMap(request);
    }, 60);
  }

  closeLocationMap(): void {
    this.showLocationMap.set(null);
    if (this.locationMapInstance) {
      try { this.locationMapInstance.remove(); } catch { /* noop */ }
      this.locationMapInstance = null;
      this.locationMapMarker = null;
    }
  }

  locationRequest(): ServiceRequest | null {
    const id = this.showLocationMap();
    if (!id) return null;
    return this.requests().find((r) => String(r.id) === id) ?? null;
  }

  private initLocationMap(request: ServiceRequest): void {
    const leaflet = (window as any).L;
    if (!leaflet) return;
    const container = document.getElementById('request-location-map');
    if (!container) return;
    const lat = Number(request.latitude);
    const lng = Number(request.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    if (this.locationMapInstance && !document.body.contains(this.locationMapInstance.getContainer())) {
      this.locationMapInstance.remove();
      this.locationMapInstance = null;
      this.locationMapMarker = null;
    }
    if (this.locationMapInstance) {
      try { this.locationMapInstance.remove(); } catch { /* noop */ }
      this.locationMapInstance = null;
      this.locationMapMarker = null;
    }

    this.locationMapInstance = leaflet.map('request-location-map').setView([lat, lng], 16);
    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.locationMapInstance);
    this.locationMapMarker = leaflet.marker([lat, lng]).addTo(this.locationMapInstance);
    const cliente = this.clienteNombre(request);
    const esp = this.especialidadNombre(request);
    this.locationMapMarker
      .bindPopup(`<b>${esp}</b><br/>${request.address}<br/>Cliente: ${cliente}`)
      .openPopup();
    setTimeout(() => this.locationMapInstance?.invalidateSize(), 200);
  }

  isProfessional(): boolean {
    return this.auth.hasRole('PROFESIONAL');
  }

  isClient(): boolean {
    return this.auth.hasRole('CLIENTE');
  }

  accept(request: ServiceRequest): void {
    const actorId = this.auth.currentUser()?.id;
    if (!actorId) return;
    this.errorMessage.set('');
    this.api.acceptRequest(String(request.id), actorId, '').pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo aceptar la solicitud'));
        return of(null);
      }),
    ).subscribe((updated) => {
      if (updated) {
        this.requestService.updateStatus(request.id, updated.status);
        this.successMessage.set('Solicitud aceptada. Podés comunicarte con el cliente por el chat.');
      }
    });
  }

  promptReject(request: ServiceRequest): void {
    this.rejectingRequestId.set(String(request.id));
    this.rejectReason.set('');
  }

  cancelReject(): void {
    this.rejectingRequestId.set(null);
    this.rejectReason.set('');
  }

  confirmReject(): void {
    const requestId = this.rejectingRequestId();
    const actorId = this.auth.currentUser()?.id;
    if (!requestId || !actorId) return;

    const motivo = this.rejectReason().trim() || 'No disponible para el horario o zona seleccionada';
    this.errorMessage.set('');
    this.api.rejectRequest(requestId, actorId, motivo).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo rechazar la solicitud'));
        return of(null);
      }),
    ).subscribe((updated) => {
      this.rejectingRequestId.set(null);
      if (updated) {
        this.requestService.updateStatus(requestId, updated.status);
        this.successMessage.set('Solicitud rechazada.');
        this.reloadRequests();
      }
    });
  }

  cancel(request: ServiceRequest): void {
    const actorId = this.auth.currentUser()?.id;
    if (!actorId) return;
    this.errorMessage.set('');
    this.api.cancelRequest(String(request.id), actorId, 'Cancelada por el cliente').pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo cancelar la solicitud'));
        return of(null);
      }),
    ).subscribe((updated) => {
      if (updated) {
        this.requestService.updateStatus(request.id, updated.status);
        this.successMessage.set('Solicitud cancelada.');
        this.reloadRequests();
      }
    });
  }

  complete(request: ServiceRequest): void {
    const actorId = this.auth.currentUser()?.id;
    if (!actorId) return;
    this.errorMessage.set('');
    this.api.completeRequest(String(request.id), actorId).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo completar la solicitud'));
        return of(null);
      }),
    ).subscribe((updated) => {
      if (updated) {
        this.requestService.updateStatus(request.id, updated.status);
        this.successMessage.set('La solicitud fue marcada como completada. ¡Ahora podés calificar el servicio!');
        this.reloadRequests();
      }
    });
  }

  // --- CHAT MODULE ---
  toggleChat(requestId: string | number): void {
    const idStr = String(requestId);
    if (this.activeChatId() === idStr) {
      this.activeChatId.set(null);
    } else {
      this.activeChatId.set(idStr);
      this.loadMessages(idStr);
    }
  }

  loadMessages(requestId: string): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.api.getMessages(requestId, userId).pipe(
      catchError(() => of([])),
    ).subscribe((msgs) => {
      this.chatMessages.update((prev) => ({
        ...prev,
        [requestId]: (msgs as unknown as MessageItem[]) ?? [],
      }));
    });
  }

  sendMessage(requestId: string | number): void {
    const text = this.chatInput().trim();
    const userId = this.auth.currentUser()?.id;
    const idStr = String(requestId);
    if (!text || !userId) return;

    this.sendingChat.set(true);
    this.api.sendMessage(idStr, { emisorId: userId, texto: text }).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo enviar el mensaje'));
        return of(null);
      }),
    ).subscribe((created) => {
      this.sendingChat.set(false);
      if (created) {
        this.chatInput.set('');
        this.loadMessages(idStr);
      }
    });
  }

  isOwnMessage(msg: MessageItem): boolean {
    return msg.emisorId === this.auth.currentUser()?.id;
  }

  // --- RATING MODULE ---
  loadRating(requestId: string): void {
    this.api.getRating(requestId).pipe(
      catchError(() => of(null)),
    ).subscribe((rating) => {
      this.ratings.update((prev) => ({
        ...prev,
        [requestId]: rating,
      }));
    });
  }

  setRating(requestId: string | number, score: number): void {
    const idStr = String(requestId);
    this.ratingScore.update((prev) => ({ ...prev, [idStr]: score }));
  }

  getScore(requestId: string | number): number {
    return this.ratingScore()[String(requestId)] || 5;
  }

  getRatingComment(requestId: string | number): string {
    return this.ratingComment()[String(requestId)] || '';
  }

  setRatingComment(requestId: string | number, comment: string): void {
    const idStr = String(requestId);
    this.ratingComment.update((prev) => ({ ...prev, [idStr]: comment }));
  }

  submitRating(request: ServiceRequest): void {
    const reqId = String(request.id);
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    const score = this.getScore(reqId);
    const comment = this.ratingComment()[reqId] || '';

    this.submittingRating.set(true);
    this.errorMessage.set('');
    this.api.createRating(reqId, userId, score, comment).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo registrar la calificación'));
        return of(null);
      }),
    ).subscribe((res) => {
      this.submittingRating.set(false);
      if (res) {
        this.successMessage.set('¡Muchas gracias por calificar al profesional!');
        this.loadRating(reqId);
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
      PENDIENTE: 'Esperando confirmación',
      ACEPTADA: 'Coordinación activa · Usá el chat',
      RECHAZADA: 'Rechazada · Podés buscar otro profesional',
      COMPLETADA: 'Servicio finalizado con éxito',
      CANCELADA: 'Solicitud cancelada',
      VENCIDA: 'Solicitud vencida sin respuesta',
    }[status] ?? 'Revisá el estado de esta solicitud';
  }
}

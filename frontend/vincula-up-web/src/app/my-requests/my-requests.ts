import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, of } from 'rxjs';
import { RequestStatus, ServiceRequest } from '../core/models/service-request';
import { Professional } from '../core/models/professional';
import { ApiService, ClienteInfo } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { RequestService } from '../core/services/request.service';
import { fotoUtil } from '../core/utils/photo';

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
    imports: [CommonModule, RouterLink, FormsModule, MatButtonModule, MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  selector: 'app-my-requests',
  styleUrl: './my-requests.css',
  templateUrl: './my-requests.html',
})
export class MyRequests {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly requests = this.requestService.myRequests;
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  // Filtros y orden (Material)
  readonly statusFilter = signal<'TODAS' | RequestStatus>('TODAS');
  readonly searchTerm = signal('');
  readonly specialtyFilter = signal<string>('TODAS');
  readonly sortOrder = signal<'RECIENTES' | 'PROXIMAS' | 'ANTIGUAS'>('RECIENTES');

  readonly statusOptions: ReadonlyArray<{ value: 'TODAS' | RequestStatus; label: string }> = [
    { value: 'TODAS', label: 'Todas' },
    { value: 'PENDIENTE', label: 'Pendientes' },
    { value: 'ACEPTADA', label: 'Aceptadas' },
    { value: 'RECHAZADA', label: 'Rechazadas' },
    { value: 'COMPLETADA', label: 'Completadas' },
    { value: 'CANCELADA', label: 'Canceladas' },
    { value: 'VENCIDA', label: 'Vencidas' },
  ];

  readonly sortOptions: ReadonlyArray<{ value: 'RECIENTES' | 'PROXIMAS' | 'ANTIGUAS'; label: string }> = [
    { value: 'RECIENTES', label: 'Más recientes primero' },
    { value: 'PROXIMAS', label: 'Próximos turnos primero' },
    { value: 'ANTIGUAS', label: 'Más antiguas primero' },
  ];

  readonly specialtyOptions = computed(() => {
    const names = new Map<string, string>();
    for (const request of this.requests()) {
      const key = request.especialidadId ?? request.specialty ?? '';
      if (key) names.set(key, this.especialidadNombre(request));
    }
    return [...names.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  });

  /** Solicitudes visibles según filtros + búsqueda + orden. */
  readonly filteredRequests = computed(() => {
    const status = this.statusFilter();
    const specialty = this.specialtyFilter();
    const term = this.searchTerm().trim().toLowerCase();
    const order = this.sortOrder();

    const matches = this.requests().filter((request) => {
      if (status !== 'TODAS' && request.status !== status) return false;
      if (specialty !== 'TODAS') {
        const key = request.especialidadId ?? request.specialty ?? '';
        if (key !== specialty) return false;
      }
      if (term) {
        const haystack = [
          this.especialidadNombre(request),
          request.professionalName,
          this.clienteNombre(request),
          request.address,
          request.date,
          request.id,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      if (order === 'PROXIMAS') return this.requestDateTime(a) - this.requestDateTime(b);
      const aCreated = this.createdTimestamp(a);
      const bCreated = this.createdTimestamp(b);
      if (aCreated !== bCreated) return order === 'RECIENTES' ? bCreated - aCreated : aCreated - bCreated;
      return this.requestDateTime(a) - this.requestDateTime(b);
    });
  });

  readonly hasActiveFilters = computed(
    () =>
      this.statusFilter() !== 'TODAS' ||
      this.specialtyFilter() !== 'TODAS' ||
      this.searchTerm().trim().length > 0,
  );

  clearFilters(): void {
    this.statusFilter.set('TODAS');
    this.specialtyFilter.set('TODAS');
    this.searchTerm.set('');
  }

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
  // Detalle del profesional para el cliente: foto + nombre + especialidad
  readonly profesionales = signal<Record<string, Professional | null>>({});
  // Fotos que devolvieron error al cargar (hotlink bloqueado, URL vencida…):
  // se ocultan para mostrar las iniciales en su lugar.
  readonly failedPhotos = signal<Set<string>>(new Set());

  markPhotoFailed(id: string): void {
    if (!id) return;
    this.failedPhotos.update((ids) => new Set([...ids, id]));
  }
  readonly especialidades = signal<Record<string, string>>({});
  readonly loadingSpecialties = signal(true);
  readonly specialtiesError = signal('');
  readonly detailOpen = signal<Record<string, boolean>>({});

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
            // Si soy cliente, traigo la ficha del profesional asignado (foto + nombre)
            if (!this.isProfessional() && req.professionalId) {
              this.loadProfesional(req.professionalId);
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

  /** Iniciales del cliente para el avatar (foto o iniciales) de la solicitud. */
  clienteInitials(request: ServiceRequest): string {
    const c = this.clienteDe(request);
    const parts = [c?.nombre, c?.apellido].filter((p) => p && p.trim().length > 0);
    if (parts.length === 0) return 'VU';
    return parts.map((p) => p!.trim()[0]!.toUpperCase()).join('').slice(0, 2);
  }

  // ── Ficha del profesional (a quién le pediste el turno) ──
  loadProfesional(profesionalId: string): void {
    if (!profesionalId || this.profesionales()[profesionalId] !== undefined) return;
    // marcado como pendiente para no repetir llamadas
    this.profesionales.update((prev) => ({ ...prev, [profesionalId]: null }));
    this.api.getProfessionalById(profesionalId).pipe(catchError(() => of(null))).subscribe((prof) => {
      if (prof) {
        this.profesionales.update((prev) => ({ ...prev, [profesionalId]: { ...prof, fotoUrl: fotoUtil(prof.fotoUrl) } }));
      }
    });
  }

  profesionalDe(request: ServiceRequest): Professional | null {
    const key = request.professionalId;
    const cached = key ? this.profesionales()[key] ?? null : null;
    if (cached) return cached;
    // Las solicitudes viejas pueden guardar el id de perfil en vez del usuarioId
    // (o viceversa): si ya tenemos cargada la ficha bajo la otra clave, la
    // reutilizamos para no dejar el avatar sin foto.
    for (const prof of Object.values(this.profesionales())) {
      if (!prof) continue;
      if (prof.id === key || prof.usuarioId === key) return prof;
    }
    return null;
  }

  /**
   * Foto del profesional lista para el `<img>`: `null` si no hay foto o si ya
   * falló la carga (hotlink bloqueado, URL vencida…), para mostrar iniciales.
   */
  fotoProfesional(request: ServiceRequest): string | null {
    const prof = this.profesionalDe(request);
    const foto = fotoUtil(prof?.fotoUrl);
    if (!foto) return null;
    if (prof?.id && this.failedPhotos().has(prof.id)) return null;
    if (!prof?.id && this.failedPhotos().has(request.professionalId)) return null;
    return foto;
  }

  profesionalNombre(request: ServiceRequest): string {
    const p = this.profesionalDe(request);
    if (p) {
      const full = `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim();
      if (full) return full;
    }
    // Fallback: el nombre que traía la solicitud (evitando el genérico).
    const previo = (request.professionalName ?? '').trim();
    return previo && previo !== 'Profesional Vincula-UP' ? previo : 'Profesional';
  }

  /** Iniciales del profesional para el avatar (foto o iniciales) de la solicitud. */
  profesionalInitials(request: ServiceRequest): string {
    const p = this.profesionalDe(request);
    const parts = [p?.nombre, p?.apellido].filter((parte) => parte && parte.trim().length > 0);
    if (parts.length === 0) return 'P';
    return parts.map((parte) => parte!.trim()[0]!.toUpperCase()).join('').slice(0, 2);
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

  // ── Ubicación: dirección + mapa embebido OSM (sin exponer coordenadas) ──
  /** Coordenadas válidas solo para construir el mapa; nunca se muestran en el texto. */
  private mapCoords(request: ServiceRequest): { lat: number; lng: number } | null {
    const lat = Number(request.latitude);
    const lng = Number(request.longitude);
    if (
      request.latitude == null || request.longitude == null ||
      Number.isNaN(lat) || Number.isNaN(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      return null;
    }
    return { lat, lng };
  }

  /**
   * URL del mapa embebido de OpenStreetMap centrada en la ubicación del servicio.
   * Marca solo el punto (bbox pequeño alrededor); null si no hay coords válidas.
   */
  embeddedMapUrl(request: ServiceRequest): SafeResourceUrl | null {
    const coords = this.mapCoords(request);
    if (!coords) return null;
    const delta = 0.008;
    const bbox = `${coords.lng - delta}%2C${coords.lat - delta}%2C${coords.lng + delta}%2C${coords.lat + delta}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  googleMapsUrl(request: ServiceRequest): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.address || '')}`;
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

  private requestDateTime(request: ServiceRequest): number {
    if (!request.date) return Number.MAX_SAFE_INTEGER;
    const time = request.time?.trim() ? request.time : '00:00';
    const parsed = new Date(`${request.date}T${time}`);
    const value = parsed.getTime();
    return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
  }

  private createdTimestamp(request: ServiceRequest): number {
    if (request.fechaCreacion) {
      const value = new Date(request.fechaCreacion).getTime();
      if (!Number.isNaN(value)) return value;
    }
    const numericId = Number(request.id);
    if (!Number.isNaN(numericId) && numericId > 0) return numericId;
    return this.requestDateTime(request);
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

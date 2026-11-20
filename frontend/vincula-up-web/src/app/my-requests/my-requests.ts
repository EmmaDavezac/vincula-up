import { Component, computed, effect, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { RequestStatus, ServiceRequest } from '../core/models/service-request';
import { Professional } from '../core/models/professional';
import { ApiService, ClienteInfo } from '../core/services/api.service';
import { DataRefreshService } from '../core/services/data-refresh.service';
import { AuthService } from '../core/services/auth.service';
import { RequestService } from '../core/services/request.service';
import { NotificationService } from '../core/services/notification.service';
import { OperationFeedbackService } from '../core/services/operation-feedback.service';
import { ChatRealtimeService, RealtimeChatMessage } from '../core/services/chat-realtime.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { fotoUtil } from '../core/utils/photo';
import { VuAvatar } from '../shared/avatar/avatar';
import { VuConfirm } from '../shared/confirm/confirm';
import { VU_DIALOG_SIZE } from '../shared/dialog-size';
import { VuIcon } from '../shared/icon/icon';
import { VuSkeletonList } from '../shared/skeleton-list/skeleton-list';
import type { RequestSkeletonShape } from '../shared/skeleton-list/skeleton-list';
import { VuSpinner } from '../shared/spinner/spinner';
import { ChatAutoScrollDirective } from './chat-auto-scroll.directive';

interface MessageItem {
  id: string;
  solicitudId: string;
  emisorId: string;
  texto: string;
  fechaEnvio: string;
}

/** Franjas del flujo de creación: el turno siempre se muestra como rango. */
const FRANJAS_HORARIAS: ReadonlyArray<{ start: string; end: string; label: string }> = [
  { start: '08:00', end: '12:00', label: '08:00 a 12:00 hs' },
  { start: '12:00', end: '16:00', label: '12:00 a 16:00 hs' },
  { start: '16:00', end: '20:00', label: '16:00 a 20:00 hs' },
];

interface RatingItem {
  id?: string;
  solicitudId?: string;
  puntaje: number;
  comentario: string;
}

@Component({
  imports: [CommonModule, RouterLink, FormsModule, MatButtonModule, VuAvatar, VuConfirm, VuIcon, VuSkeletonList, VuSpinner, ChatAutoScrollDirective],
	selector: 'app-my-requests',
	styleUrl: './my-requests.css',
	templateUrl: './my-requests.html',
})
export class MyRequests {
  private readonly api = inject(ApiService);
  private readonly dataRefresh = inject(DataRefreshService);
  private readonly operationFeedback = inject(OperationFeedbackService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @ViewChild('chatDialog') private chatDialog!: TemplateRef<unknown>;
  @ViewChild('statusDialog') private statusDialog!: TemplateRef<unknown>;
  @ViewChild('reasonDialog') private reasonDialog!: TemplateRef<unknown>;
  @ViewChild('mapDialog') private mapDialog!: TemplateRef<unknown>;
  private mapDialogRef?: MatDialogRef<unknown>;

  readonly mapRequestId = signal<string | null>(null);
  readonly solicitudDelMapa = computed(() => {
    const id = this.mapRequestId();
    return id ? (this.requests().find((r) => String(r.id) === id) ?? null) : null;
  });
  private chatDialogRef?: MatDialogRef<unknown>;
  private statusDialogRef?: MatDialogRef<unknown>;
  private reasonDialogRef?: MatDialogRef<unknown>;
  readonly auth = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly notifications = inject(NotificationService);
  readonly chatRealtime = inject(ChatRealtimeService);
  private readonly sanitizer = inject(DomSanitizer);

  /** Cache de URLs de mapa: evita crear SafeResourceUrl en cada detección de cambios (ciclo NG0600). */
  private readonly _urlCache = new Map<string, SafeResourceUrl>();

  readonly requests = this.requestService.myRequests;
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  /**
   * Primera carga de la lista: mientras dura se muestra el skeleton y no el
   * estado vacío (que diría "todavía no tenés solicitudes" sin haber llegado nada).
   */
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly highlightedRequestId = signal<string | null>(null);
  private pendingNotificationRequestId: string | null = null;
  private pendingNotificationOpensChat = false;
  private highlightTimeout?: ReturnType<typeof setTimeout>;
  /** El mapa embebido todavía está cargando sus tiles. */
  readonly mapaCargando = signal(false);

  /**
   * Activa el spinner de carga del mapa cuando hay solicitudes profesionales
   * con coordenadas visibles. Se usa un `effect` (no un método de template) para
   * evitar el ciclo de detección de cambios NG0600: `embeddedMapUrl` se evalúa en
   * cada cambio, así que no puede activar signals por sí mismo.
   */
  private readonly _mapaLoadEffect = effect(() => {
    if (this.isProfessional()) {
      const tieneMapa = this.filteredRequests().some((r) => this.mapCoords(r) != null);
      if (tieneMapa) {
        this.mapaCargando.set(true);
      }
    }
  });

  // Filtros de la lista
  readonly statusFilter = signal<'TODAS' | RequestStatus>('TODAS');
  readonly specialtyFilter = signal<string>('TODAS');
  readonly requestSearch = signal('');
  readonly requestOrder = signal<'oldest' | 'newest'>('newest');
  readonly filtersRefreshing = signal(false);
  private filterRefreshTimeout?: ReturnType<typeof setTimeout>;

  readonly statusOptions: ReadonlyArray<{ value: 'TODAS' | RequestStatus; label: string }> = [
    { value: 'TODAS', label: 'Todas' },
    { value: 'PENDIENTE', label: 'Pendientes' },
    { value: 'ACEPTADA', label: 'Aceptadas' },
    { value: 'EN_CAMINO', label: 'Profesional en camino' },
    { value: 'TRABAJO_REALIZADO', label: 'Trabajo realizado' },
    { value: 'RECHAZADA', label: 'Rechazadas' },
    { value: 'COMPLETADA', label: 'Completadas' },
    { value: 'CANCELADA', label: 'Canceladas' },
    { value: 'VENCIDA', label: 'Vencidas' },
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

  /** Solicitudes visibles según los filtros. */
  readonly filteredRequests = computed(() => {
    const status = this.statusFilter();
    const specialty = this.specialtyFilter();
    const query = this.normalizarTexto(this.requestSearch());
    const direction = this.requestOrder() === 'oldest' ? 1 : -1;

    return this.requests().filter((request) => {
      if (status !== 'TODAS' && request.status !== status) return false;
      if (specialty !== 'TODAS') {
        const key = request.especialidadId ?? request.specialty ?? '';
        if (key !== specialty) return false;
      }
      if (query) {
      const nombreContraparte = this.isProfessional()
        ? this.clienteNombre(request)
        : this.profesionalNombre(request);
      const coincideNombre = this.normalizarTexto(nombreContraparte).includes(query);
			const coincideDireccion = this.normalizarTexto(request.address).includes(query);
      if (!coincideNombre && !coincideDireccion) return false;
		}
      return true;
    }).sort((a, b) => {
		const dateA = this.requestDateTime(a);
		const dateB = this.requestDateTime(b);
		const invalidDate = Number.MAX_SAFE_INTEGER;
		if (dateA === invalidDate || dateB === invalidDate) {
			if (dateA === dateB) return 0;
			return dateA === invalidDate ? 1 : -1;
		}
		if (dateA === dateB) return 0;
		return (dateA < dateB ? -1 : 1) * direction;
    });
  });

  readonly requestSkeletonShapes = computed<readonly RequestSkeletonShape[]>(() =>
    this.filteredRequests().map((request) => {
		const isProfessional = this.isProfessional();
		const rating = this.ratings()[String(request.id)];
		const canChangeStatus = this.estadosDisponibles(request).length > 0;
		const hasAlternateAction = !isProfessional && (request.status === 'RECHAZADA' || request.status === 'VENCIDA');
		const ratingState: RequestSkeletonShape['rating'] = request.status !== 'COMPLETADA'
		  ? 'none'
		  : rating
		    ? 'submitted'
		    : isProfessional
		      ? 'waiting'
		      : 'form';

		return {
		  hasDescription: Boolean(request.description),
		  hasAddress: Boolean(request.address) || (isProfessional && this.isPending(request)),
		  hasMap: isProfessional && Boolean(request.address),
		  hasClosureReason: Boolean(this.cierreLabel(request)),
		  actionCount: canChangeStatus && this.puedeChatear(request)
		    ? 2
		    : canChangeStatus || hasAlternateAction
		      ? 1
		      : 0,
		  rating: ratingState,
		  hasRatingComment: Boolean(rating?.comentario),
		};
    }),
  );

  clearFilters(): void {
    this.actualizarFiltros(() => {
      this.statusFilter.set('TODAS');
      this.specialtyFilter.set('TODAS');
      this.requestSearch.set('');
    });
  }

  cambiarEstadoFiltro(value: 'TODAS' | RequestStatus): void {
		this.actualizarFiltros(() => this.statusFilter.set(value));
	}

  cambiarCategoriaFiltro(value: string): void {
		this.actualizarFiltros(() => this.specialtyFilter.set(value));
  }

  cambiarBusqueda(value: string): void {
		this.actualizarFiltros(() => this.requestSearch.set(value));
  }

  limpiarBusqueda(): void {
    this.actualizarFiltros(() => this.requestSearch.set(''));
  }

  cambiarOrden(value: 'oldest' | 'newest'): void {
    this.actualizarFiltros(() => this.requestOrder.set(value));
  }

  private actualizarFiltros(update: () => void): void {
		this.filtersRefreshing.set(true);
		update();
		if (this.filterRefreshTimeout) clearTimeout(this.filterRefreshTimeout);
		this.filterRefreshTimeout = setTimeout(() => this.filtersRefreshing.set(false), 220);
  }

  private normalizarTexto(value: string | null | undefined): string {
		return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
	}

  // Chat state
  readonly activeChatId = signal<string | null>(null);
  readonly chatMessages = signal<Record<string, MessageItem[]>>({});
  readonly chatInput = signal('');
  readonly sendingChat = signal(false);

  // Estado de la solicitud / rechazo modal/dialog state
  /** Solicitud abierta en el modal de "Actualizar estado" (cliente y profesional). */
  readonly updatingRequestId = signal<string | null>(null);
  /** Mensaje de cancelación: obligatorio para el cliente y para el profesional. */
  readonly motivoEstado = signal('');
  readonly motivoSeleccionado = signal('');
  readonly motivosSolicitud = [
    'Incompatibilidad de horario',
    'Fuera de la zona de cobertura',
    'No puedo continuar con el servicio',
    'Solicitud duplicada',
    'El servicio ya no es necesario',
    'Otro',
  ];
  /** Error del mensaje obligatorio, para dejarlo debajo del campo. */
  readonly motivoError = signal('');
  /** Transición que espera confirmación escribiendo su motivo (solo cancelar). */
  readonly estadoAConfirmar = signal<RequestStatus | null>(null);

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

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const requestId = params.get('solicitudId');
      if (!requestId) return;
      this.pendingNotificationRequestId = requestId;
      this.pendingNotificationOpensChat = params.get('abrirChat') === 'true';
      this.openNotificationTargetIfReady();
    });
    this.reloadRequests();
    this.loadEspecialidades();
    this.dataRefresh.watch(['requests'])
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.reloadRequests());
  }

  reloadRequests(): void {
    if (this.requests().length > 0) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
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
        // Pase lo que pase (lista o error) la carga terminó: se oculta el skeleton.
        this.loading.set(false);
        this.refreshing.set(false);
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
          this.openNotificationTargetIfReady();
        }
      });
    } else {
      // Sin sesión no se pide nada: si no, el skeleton quedaría visible para siempre.
      this.loading.set(false);
      this.refreshing.set(false);
    }
  }

  private openNotificationTargetIfReady(): void {
    const requestId = this.pendingNotificationRequestId;
    if (!requestId || this.loading()) return;
    const request = this.requests().find((item) => String(item.id) === requestId);
    if (!request) return;

    const abrirChat = this.pendingNotificationOpensChat && this.puedeChatear(request);
    this.pendingNotificationRequestId = null;
    this.pendingNotificationOpensChat = false;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { solicitudId: null, abrirChat: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    if (abrirChat) {
      this.toggleChat(request.id);
      return;
    }

    this.clearFilters();
    this.highlightedRequestId.set(requestId);
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    requestAnimationFrame(() => {
      document.getElementById(`solicitud-${requestId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    this.highlightTimeout = setTimeout(() => this.highlightedRequestId.set(null), 3000);
  }

  esSolicitudResaltada(requestId: string | number): boolean {
		return this.highlightedRequestId() === String(requestId);
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

  // ── Ficha del profesional (a quién le pediste el turno) ──
  loadProfesional(profesionalId: string): void {
    if (!profesionalId || this.profesionales()[profesionalId] !== undefined) return;
    // marcado como pendiente para no repetir llamadas
    this.profesionales.update((prev) => ({ ...prev, [profesionalId]: null }));
    this.api.getProfessionalById(profesionalId).pipe(catchError(() => of(null))).subscribe((prof) => {
      if (prof) {
        this.profesionales.update((prev) => ({ ...prev, [profesionalId]: prof }));
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
   * Id del usuario dueño de la foto del profesional de la solicitud. La imagen la
   * pide el `vu-avatar` por su id (el backend controla si ese rol puede verla);
   * `null` cuando la ficha todavía no cargó o el profesional no tiene foto.
   */
  usuarioIdProfesional(request: ServiceRequest): string | null {
    return this.profesionalDe(request)?.usuarioId ?? null;
  }

  tieneFotoProfesional(request: ServiceRequest): boolean {
    return this.profesionalDe(request)?.tieneFoto === true;
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

/** Coordenadas reales, solo validadas. */
private exactCoords(request: ServiceRequest): { lat: number; lng: number } | null {
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

/** Hash FNV-1a → número en [0, 1). Estable para el mismo texto. */
private seededUnit(seed: string, salt: string): number {
  let h = 2166136261;
  const text = `${seed}:${salt}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Coordenadas que se dibujan en el mapa. Si la solicitud está pendiente se
 * desplaza el punto entre 8 y 20 m en una dirección fija por solicitud.
 */
private mapCoords(request: ServiceRequest): { lat: number; lng: number } | null {
  const exact = this.exactCoords(request);
  if (!exact) return null;
  if (request.status !== 'PENDIENTE') return exact;

  const seed = String(request.id);
  const angle = this.seededUnit(seed, 'a') * 2 * Math.PI;
  const meters = 8 + this.seededUnit(seed, 'd') * 12;
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.cos((exact.lat * Math.PI) / 180));
  return { lat: exact.lat + dLat, lng: exact.lng + dLng };
}

/** Desde la aceptación, lleva a la ubicación real del servicio. */
googleMapsUrl(request: ServiceRequest): string | null {
  if (!this.puedeChatear(request)) return null;
  const c = this.exactCoords(request);
  return c ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : null;
}

puedeChatear(request: ServiceRequest): boolean {
  return request.status === 'ACEPTADA'
    || request.status === 'EN_CAMINO'
    || request.status === 'TRABAJO_REALIZADO';
}

  /**
   * URL del mapa embebido de OpenStreetMap centrada en la ubicación del servicio.
   * Marca solo el punto (bbox pequeño alrededor); null si no hay coords válidas.
   */
  embeddedMapUrl(request: ServiceRequest): SafeResourceUrl | null {
    const coords = this.mapCoords(request);
    if (!coords) return null;
    const key = `${coords.lat},${coords.lng}`;
    const cached = this._urlCache.get(key);
    if (cached) return cached;
    const delta = 0.008;
    const bbox = `${coords.lng - delta}%2C${coords.lat - delta}%2C${coords.lng + delta}%2C${coords.lat + delta}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this._urlCache.set(key, safe);
    return safe;
  }

  /** Se dispara cuando el iframe termina de cargar sus tiles. */
  onMapaLoad(): void {
    this.mapaCargando.set(false);
  }

  isProfessional(): boolean {
    return this.auth.hasRole('PROFESIONAL');
  }

  /**
   * Mientras la solicitud está pendiente, el profesional ve la zona y no la
   * dirección exacta: el backend reemplaza el campo antes de que llegue acá.
   * El cliente también la ve siempre, pero no se le antepone la etiqueta de zona.
   */
  isPending(request: ServiceRequest): boolean {
    return request.status === 'PENDIENTE';
  }

  isClient(): boolean {
    return this.auth.hasRole('CLIENTE');
  }

  /**
   * Acciones de estado disponibles para cada parte y etapa del servicio.
   */
  estadosDisponibles(request: ServiceRequest): RequestStatus[] {
    const opciones: RequestStatus[] = [];
    const esCliente = !this.isProfessional();

    if (esCliente && request.status === 'PENDIENTE') {
      opciones.push('CANCELADA');
    }
    if (this.isProfessional() && request.status === 'PENDIENTE') {
      opciones.push('ACEPTADA', 'RECHAZADA');
    }
    if (this.isProfessional() && request.status === 'ACEPTADA') {
      opciones.push('EN_CAMINO', 'CANCELADA');
    }
    if (this.isProfessional() && request.status === 'EN_CAMINO') {
      opciones.push('TRABAJO_REALIZADO', 'CANCELADA');
    }
    if (esCliente && request.status === 'TRABAJO_REALIZADO') {
      opciones.push('COMPLETADA', 'CANCELADA');
    }
    return opciones;
  }

  /** Un solo botón para cambiar el estado: abre el modal con las opciones válidas. */
  abrirActualizarEstado(request: ServiceRequest): void {
    this.errorMessage.set('');
    this.motivoEstado.set('');
    this.motivoSeleccionado.set('');
    this.estadoAConfirmar.set(null);
    this.motivoError.set('');
    this.updatingRequestId.set(String(request.id));
    this.statusDialogRef = this.dialog.open(this.statusDialog, {
  ariaLabel: 'Actualizar estado de la solicitud',
  ariaModal: true,
  ...VU_DIALOG_SIZE,
  panelClass: 'vu-details-dialog',
});
    this.statusDialogRef.afterClosed().subscribe(() => {
      this.statusDialogRef = undefined;
      this.resetEstadoDialog();
    });
  }

  /** Solicitud abierta en el modal de estado (o null). */
  readonly solicitudDelModal = computed(() => {
    const id = this.updatingRequestId();
    return id ? (this.requests().find((request) => String(request.id) === id) ?? null) : null;
  });

  /** Nombre de la contraparte según quién mira la lista. */
  nombreContraparte(request: ServiceRequest): string {
    return this.isProfessional() ? this.clienteNombre(request) : this.profesionalNombre(request);
  }

  etiquetaEstado(estado: RequestStatus): string {
    const textos: Partial<Record<RequestStatus, string>> = {
      ACEPTADA: 'Aceptar la solicitud',
      EN_CAMINO: 'Marcar que está en camino',
      TRABAJO_REALIZADO: 'Marcar trabajo realizado',
      RECHAZADA: 'Rechazar la solicitud',
      COMPLETADA: 'Confirmar trabajo completado',
      CANCELADA: 'Cancelar la solicitud',
    };
    return textos[estado] ?? 'Actualizar';
  }

  iconoEstado(estado: RequestStatus): 'check' | 'x' {
    return estado === 'ACEPTADA' || estado === 'EN_CAMINO'
      || estado === 'TRABAJO_REALIZADO' || estado === 'COMPLETADA' ? 'check' : 'x';
  }

  cerrarActualizarEstado(): void {
    this.statusDialogRef?.close();
    this.reasonDialogRef?.close();
    this.statusDialogRef = undefined;
    this.reasonDialogRef = undefined;
    this.resetEstadoDialog();
  }

  private resetEstadoDialog(): void {
    this.updatingRequestId.set(null);
    this.motivoEstado.set('');
    this.motivoSeleccionado.set('');
    this.estadoAConfirmar.set(null);
    this.motivoError.set('');
  }

  /**
   * Rechazo y cancelación comparten el formulario de motivos; las demás acciones
   * muestran una confirmación antes de aplicarse.
   */
  elegirEstado(request: ServiceRequest, nuevo: RequestStatus): void {
    this.updatingRequestId.set(String(request.id));
    if (nuevo === 'CANCELADA' || nuevo === 'RECHAZADA') {
      this.estadoAConfirmar.set(nuevo);
      this.motivoEstado.set('');
      this.motivoSeleccionado.set('');
      this.motivoError.set('');
      this.reasonDialogRef = this.dialog.open(this.reasonDialog, {
        ariaLabel: nuevo === 'CANCELADA' ? 'Motivo de la cancelación' : 'Motivo del rechazo',
        ariaModal: true,
        ...VU_DIALOG_SIZE,
        panelClass: 'vu-details-dialog',
      });
      this.reasonDialogRef.afterClosed().subscribe(() => {
        this.reasonDialogRef = undefined;
        if (this.estadoAConfirmar()) {
          this.volverAEstadoOpciones();
        }
      });
      return;
    }
    this.confirmacionTransicion.set({ request, nuevo });
  }

  /** Aplica la transición elegida en el diálogo de confirmación. */
  confirmarTransicion(): void {
    const pendiente = this.confirmacionTransicion();
    if (!pendiente) return;
    this.confirmacionTransicion.set(null);
    this.cerrarActualizarEstado();
    this.aplicarEstado(pendiente.request, pendiente.nuevo);
  }

  /** Transición pendiente de confirmación que no requiere el formulario de motivos. */
  readonly confirmacionTransicion = signal<{ request: ServiceRequest; nuevo: RequestStatus } | null>(null);

  /** Título y consecuencia de la transición elegida. */
  transicionTitulo(): string {
    const nuevo = this.confirmacionTransicion()?.nuevo;
    const titulos: Partial<Record<RequestStatus, string>> = {
      ACEPTADA: 'Aceptar la solicitud',
      EN_CAMINO: 'Marcar que estás en camino',
      TRABAJO_REALIZADO: 'Marcar trabajo realizado',
      COMPLETADA: 'Confirmar trabajo completado',
    };
    return (nuevo && titulos[nuevo]) || 'Actualizar el estado';
  }

  transicionMensaje(): string {
    const pendiente = this.confirmacionTransicion();
    if (!pendiente) return '';
    const contraparte = this.nombreContraparte(pendiente.request);
    if (pendiente.nuevo === 'ACEPTADA') {
      return `¿Querés aceptar el turno de ${contraparte}?`;
    }
    if (pendiente.nuevo === 'EN_CAMINO') {
      return '¿Querés avisarle al cliente que ya estás en camino?';
    }
    if (pendiente.nuevo === 'TRABAJO_REALIZADO') {
      return '¿Confirmás que terminaste el trabajo y querés pedirle al cliente que lo revise?';
    }
    if (pendiente.nuevo === 'COMPLETADA') {
      return '¿Confirmás que el trabajo fue realizado correctamente?';
    }
    return `¿Confirmás que el turno con ${contraparte} ya terminó?`;
  }

  transicionDetalle(): string {
    const nuevo = this.confirmacionTransicion()?.nuevo;
    if (nuevo === 'ACEPTADA') {
      return 'Queda confirmado el turno y se habilita el chat para coordinar con la contraparte.';
    }
    if (nuevo === 'EN_CAMINO') {
      return 'El cliente recibirá un aviso y la dirección exacta seguirá disponible para coordinar.';
    }
    if (nuevo === 'TRABAJO_REALIZADO') {
      return 'El servicio quedará pendiente de confirmación del cliente antes de habilitar la calificación.';
    }
    return 'La solicitud se cierra como completada. Después podés calificar el servicio.';
  }

  transicionIcono(): 'check' | 'x' {
    const nuevo = this.confirmacionTransicion()?.nuevo;
    return nuevo === 'ACEPTADA' || nuevo === 'EN_CAMINO'
      || nuevo === 'TRABAJO_REALIZADO' || nuevo === 'COMPLETADA' ? 'check' : 'x';
  }

  transicionPeligrosa(): boolean {
    return this.confirmacionTransicion()?.nuevo === 'RECHAZADA';
  }

  /** Vuelve a la lista de opciones sin cerrar el modal. */
  volverAEstadoOpciones(): void {
    this.reasonDialogRef?.close();
    this.reasonDialogRef = undefined;
    this.estadoAConfirmar.set(null);
    this.motivoEstado.set('');
    this.motivoSeleccionado.set('');
    this.motivoError.set('');
  }

  motivoDeEstado(): string {
    return this.motivoSeleccionado() === 'Otro'
      ? this.motivoEstado().trim()
      : this.motivoSeleccionado();
  }

  /** Confirma el rechazo o la cancelación con su regla de motivo correspondiente. */
  confirmarMotivoEstado(): void {
    const solicitud = this.solicitudDelModal();
    const estado = this.estadoAConfirmar();
    if (!solicitud || (estado !== 'CANCELADA' && estado !== 'RECHAZADA')) return;
    const motivo = this.motivoDeEstado();
    if (this.motivoSeleccionado() === 'Otro' && !motivo) {
      this.motivoError.set('Escribí un motivo breve.');
      return;
    }
    if (estado === 'CANCELADA' && !motivo) {
      this.motivoError.set('Seleccioná un motivo para cancelar.');
      return;
    }
    this.aplicarEstado(solicitud, estado, motivo);
  }

  aplicarEstado(request: ServiceRequest, nuevo: RequestStatus, motivo = ''): void {
    const actorId = this.auth.currentUser()?.id;
    if (!actorId) return;
    const id = String(request.id);
    this.errorMessage.set('');
    const llamada =
      nuevo === 'EN_CAMINO' ? this.api.markRequestEnCamino(id, actorId)
      : nuevo === 'TRABAJO_REALIZADO' ? this.api.markRequestTrabajoRealizado(id, actorId)
      : nuevo === 'COMPLETADA' ? this.api.completeRequest(id, actorId)
      : nuevo === 'CANCELADA' ? this.api.cancelRequest(id, actorId, motivo)
      : nuevo === 'RECHAZADA' ? this.api.rejectRequest(id, actorId, motivo)
      : this.api.acceptRequest(id, actorId, '');

    this.operationFeedback.track(
      'Actualizando el estado de la solicitud…',
      llamada,
      'Estamos guardando el cambio y notificando a la otra persona.',
    ).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo actualizar el estado de la solicitud'));
        return of(null);
      }),
    ).subscribe((updated) => {
      this.cerrarActualizarEstado();
      if (!updated) return;
      this.requestService.updateStatus(request.id, updated.status);
      this.notifications.markStatusHandledLocally(request.id, updated.status);
      this.successMessage.set(
        nuevo === 'EN_CAMINO' ? 'El cliente recibió el aviso de que estás en camino.'
        : nuevo === 'TRABAJO_REALIZADO' ? 'Avisamos al cliente para que confirme el trabajo realizado.'
        : nuevo === 'COMPLETADA' ? 'Confirmaste el trabajo realizado. ¡Ahora podés calificar el servicio!'
        : nuevo === 'CANCELADA' ? 'Cancelaste la solicitud. La contraparte ve el motivo que escribiste.'
        : nuevo === 'RECHAZADA' ? 'Solicitud rechazada.'
        : 'Solicitud aceptada. Podés comunicarte por el chat.',
      );
    });
  }

  // --- CHAT MODULE ---
  toggleChat(requestId: string | number): void {
    const idStr = String(requestId);
    if (this.activeChatId() === idStr) {
      this.chatDialogRef?.close();
      this.activeChatId.set(null);
      this.chatRealtime.disconnect();
    } else {
      this.chatDialogRef?.close();
      this.activeChatId.set(idStr);
      this.notifications.openChat(idStr);
      this.loadMessages(idStr);
      const token = this.auth.getToken();
      if (token) this.chatRealtime.connect(idStr, token, (message) => this.recibirMensajeRealtime(message));
      const dialogRef = this.dialog.open(this.chatDialog, {
  ariaLabel: 'Chat de la solicitud',
  ariaModal: true,
  ...VU_DIALOG_SIZE,
  panelClass: 'vu-details-dialog',
});
      this.chatDialogRef = dialogRef;
      dialogRef.afterClosed().subscribe(() => {
        this.notifications.closeChat(idStr, this.auth.currentUser()?.id ?? '');
        if (this.chatDialogRef === dialogRef) {
          this.chatDialogRef = undefined;
          this.chatRealtime.disconnect();
          if (this.activeChatId() === idStr) this.activeChatId.set(null);
        }
      });
    }
  }

  private recibirMensajeRealtime(message: RealtimeChatMessage): void {
		const requestId = String(message.solicitudId);
		if (this.activeChatId() !== requestId) return;
		this.chatMessages.update((items) => {
			const messages = items[requestId] ?? [];
			if (messages.some((item) => item.id === message.id)) return items;
			return { ...items, [requestId]: [...messages, message] };
		});
	}

  esMensajePropio(message: MessageItem): boolean {
    const userId = this.auth.currentUser()?.id;
    const keycloakId = this.auth.getKeycloakId();
    return message.emisorId === userId || (!!keycloakId && message.emisorId === keycloakId);
  }

  fechaMensajeLabel(value: string): string {
    const [datePart] = value.split('T');
    const [year, month, day] = (datePart ?? '').split('-');
    return year && month && day ? `${day}/${month}/${year.slice(-2)}` : '';
  }

  horaMensajeLabel(value: string): string {
    const timePart = value.split('T')[1] ?? '';
    return timePart.slice(0, 5);
  }

  fechaSolicitudLabel(value: string): string {
    const datePart = value.split('T')[0] ?? '';
    const [year, month, day] = datePart.split('-');
    if (year && month && day) return `${day}/${month}/${year.slice(-2)}`;

    const [dayValue, monthValue, yearValue] = datePart.split('/');
    return dayValue && monthValue && yearValue
      ? `${dayValue.padStart(2, '0')}/${monthValue.padStart(2, '0')}/${yearValue.slice(-2)}`
      : value;
  }

  mostrarFechaMensaje(messages: MessageItem[], index: number): boolean {
    if (index === 0) return true;
    return messages[index - 1]?.fechaEnvio.slice(0, 10) !== messages[index]?.fechaEnvio.slice(0, 10);
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
    this.operationFeedback.track(
      'Enviando el mensaje…',
      this.api.sendMessage(idStr, { emisorId: userId, texto: text }),
      'Estamos compartiéndolo en el chat de la solicitud.',
    ).pipe(
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
    this.operationFeedback.track(
      'Guardando tu calificación…',
      this.api.createRating(reqId, userId, score, comment),
      'Estamos registrando tu opinión sobre el servicio.',
    ).pipe(
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
      PENDIENTE: 'Pendiente',
      ACEPTADA: 'Aceptada',
      EN_CAMINO: 'Profesional en camino',
      TRABAJO_REALIZADO: 'Trabajo realizado',
      RECHAZADA: 'Rechazada',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
      VENCIDA: 'Vencida',
    }[status] ?? status;
  }

  /**
   * Textos genéricos que el sistema generaba antes de solicitar motivos. No
   * los escribió ninguna persona, así que no se muestran como si fueran suyas.
   */
  private readonly MOTIVOS_GENERICOS = [
    'Cancelada por la contraparte',
    'No disponible para el horario o zona seleccionada',
  ];

  /**
   * Aclara quién dejó la solicitud en su estado final, según quién mira la lista:
   * el que canceló se lo ve como "vos" y el otro como la contraparte.
   * Las solicitudes canceladas antes de que se guardara el autor no permiten
   * atribuirlo, y en ese caso no se inventa quién fue.
   */
  cierreLabel(request: ServiceRequest): string {
    const soyProfesional = this.isProfessional();
    if (request.status === 'RECHAZADA') {
      return soyProfesional ? 'La rechazaste vos.' : 'La rechazó el profesional.';
    }
    if (request.status !== 'CANCELADA') {
      return '';
    }
    const rol = request.canceladaPorRol;
    if (rol === 'CLIENTE') {
      return soyProfesional ? 'La canceló el cliente.' : 'La cancelaste vos.';
    }
    if (rol === 'PROFESIONAL') {
      return soyProfesional ? 'La cancelaste vos.' : 'La canceló el profesional.';
    }
    return 'Solicitud cancelada.';
  }

  /** El motivo solo se muestra si lo escribió la persona que canceló o rechazó. */
  motivoLegible(request: ServiceRequest): string {
    const motivo = (request.motivoCancelacion ?? '').trim();
    if (!motivo || this.MOTIVOS_GENERICOS.includes(motivo)) {
      return '';
    }
    return motivo;
  }


  /**
   * Horario del turno como rango ("08:00 a 12:00 hs"). Las solicitudes anteriores a
   * guardar el fin se reconstruyen con las franjas conocidas a partir del inicio.
   */
  horarioLabel(request: ServiceRequest): string {
    const inicio = request.time?.trim() ?? '';
    const fin = request.timeEnd?.trim() ?? '';
    if (fin) {
      return `${inicio} a ${fin} hs`;
    }
    const franja = FRANJAS_HORARIAS.find((item) => item.start === inicio);
    return franja ? franja.label : inicio;
  }

  // ── Presentación (tokens del prototipo) ────────────────────────────────

  /** Solicitud del chat abierto, para el modal de coordinación. */
  readonly activeRequest = computed(() => {
    const id = this.activeChatId();
    return id ? (this.requests().find((request) => String(request.id) === id) ?? null) : null;
  });

  /** Etiqueta del contador superior: cambia según quién mira la pantalla. */
  get pendingLabel(): string {
    return this.isProfessional() ? 'solicitudes pendientes' : 'solicitudes en revisión';
  }

  countPending(): number {
    return this.requests().filter((request) => request.status === 'PENDIENTE').length;
  }
  abrirMapa(request: ServiceRequest): void {
  this.mapRequestId.set(String(request.id));
  this.mapDialogRef = this.dialog.open(this.mapDialog, {
    ariaLabel: 'Mapa de la ubicación',
    ariaModal: true,
    ...VU_DIALOG_SIZE,
    panelClass: 'vu-details-dialog',
  });
  this.mapDialogRef.afterClosed().subscribe(() => {
    this.mapDialogRef = undefined;
    this.mapRequestId.set(null);
  });
}

cerrarMapa(): void {
  this.mapDialogRef?.close();
}

  /** Clase del badge según el estado, con los colores del prototipo. */
  statusClass(status: RequestStatus): string {
    switch (status) {
      case 'PENDIENTE':
        return 'vu-badge--pendiente';
      case 'ACEPTADA':
        return 'vu-badge--aceptada';
      case 'EN_CAMINO':
        return 'vu-badge--en-camino';
      case 'TRABAJO_REALIZADO':
        return 'vu-badge--trabajo-realizado';
      case 'COMPLETADA':
        return 'vu-badge--completada';
      case 'RECHAZADA':
        return 'vu-badge--rechazada';
      case 'CANCELADA':
        return 'vu-badge--cancelada';
      case 'VENCIDA':
        return 'vu-badge--vencida';
      default:
        return 'vu-badge--neutro';
    }
  }
  
}

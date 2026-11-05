import { __decorate } from "tslib";
import { Component, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { RequestService } from '../core/services/request.service';
import { NotificationService } from '../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { VuAvatar } from '../shared/avatar/avatar';
import { VuConfirm } from '../shared/confirm/confirm';
import { VuIcon } from '../shared/icon/icon';
import { VuSkeletonList } from '../shared/skeleton-list/skeleton-list';
import { VuSpinner } from '../shared/spinner/spinner';
/** Franjas del flujo de creación: el turno siempre se muestra como rango. */
const FRANJAS_HORARIAS = [
    { start: '08:00', end: '12:00', label: '08:00 a 12:00 hs' },
    { start: '12:00', end: '16:00', label: '12:00 a 16:00 hs' },
    { start: '16:00', end: '20:00', label: '16:00 a 20:00 hs' },
];
let MyRequests = class MyRequests {
    api = inject(ApiService);
    dialog = inject(MatDialog);
    chatDialog;
    statusDialog;
    cancelDialog;
    chatDialogRef;
    statusDialogRef;
    cancelDialogRef;
    auth = inject(AuthService);
    requestService = inject(RequestService);
    notifications = inject(NotificationService);
    sanitizer = inject(DomSanitizer);
    /** Cache de URLs de mapa: evita crear SafeResourceUrl en cada detección de cambios (ciclo NG0600). */
    _urlCache = new Map();
    requests = this.requestService.myRequests;
    errorMessage = signal('');
    successMessage = signal('');
    /**
     * Primera carga de la lista: mientras dura se muestra el skeleton y no el
     * estado vacío (que diría "todavía no tenés solicitudes" sin haber llegado nada).
     */
    loading = signal(true);
    /** El mapa embebido todavía está cargando sus tiles. */
    mapaCargando = signal(false);
    /**
     * Activa el spinner de carga del mapa cuando hay solicitudes profesionales
     * con coordenadas visibles. Se usa un `effect` (no un método de template) para
     * evitar el ciclo de detección de cambios NG0600: `embeddedMapUrl` se evalúa en
     * cada cambio, así que no puede activar signals por sí mismo.
     */
    _mapaLoadEffect = effect(() => {
        if (this.isProfessional()) {
            const tieneMapa = this.filteredRequests().some((r) => this.mapCoords(r) != null);
            if (tieneMapa) {
                this.mapaCargando.set(true);
            }
        }
    });
    // Filtros de la lista
    statusFilter = signal('TODAS');
    specialtyFilter = signal('TODAS');
    statusOptions = [
        { value: 'TODAS', label: 'Todas' },
        { value: 'PENDIENTE', label: 'Pendientes' },
        { value: 'ACEPTADA', label: 'Aceptadas' },
        { value: 'RECHAZADA', label: 'Rechazadas' },
        { value: 'COMPLETADA', label: 'Completadas' },
        { value: 'CANCELADA', label: 'Canceladas' },
        { value: 'VENCIDA', label: 'Vencidas' },
    ];
    specialtyOptions = computed(() => {
        const names = new Map();
        for (const request of this.requests()) {
            const key = request.especialidadId ?? request.specialty ?? '';
            if (key)
                names.set(key, this.especialidadNombre(request));
        }
        return [...names.entries()]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label, 'es'));
    });
    /** Solicitudes visibles según los filtros. */
    filteredRequests = computed(() => {
        const status = this.statusFilter();
        const specialty = this.specialtyFilter();
        return this.requests().filter((request) => {
            if (status !== 'TODAS' && request.status !== status)
                return false;
            if (specialty !== 'TODAS') {
                const key = request.especialidadId ?? request.specialty ?? '';
                if (key !== specialty)
                    return false;
            }
            return true;
        });
    });
    hasActiveFilters = computed(() => this.statusFilter() !== 'TODAS' || this.specialtyFilter() !== 'TODAS');
    clearFilters() {
        this.statusFilter.set('TODAS');
        this.specialtyFilter.set('TODAS');
    }
    // Chat state
    activeChatId = signal(null);
    chatMessages = signal({});
    chatInput = signal('');
    sendingChat = signal(false);
    // Estado de la solicitud / rechazo modal/dialog state
    /** Solicitud abierta en el modal de "Actualizar estado" (cliente y profesional). */
    updatingRequestId = signal(null);
    /** Mensaje de cancelación: obligatorio para el cliente y para el profesional. */
    motivoEstado = signal('');
    /** Error del mensaje obligatorio, para dejarlo debajo del campo. */
    motivoError = signal('');
    /** Transición que espera confirmación escribiendo su motivo (solo cancelar). */
    estadoAConfirmar = signal(null);
    // Rating state
    ratings = signal({});
    ratingScore = signal({});
    ratingComment = signal({});
    submittingRating = signal(false);
    // Detalle enriquecido para el profesional: cliente + especialidad + mapa
    clientes = signal({});
    // Detalle del profesional para el cliente: foto + nombre + especialidad
    profesionales = signal({});
    // Fotos que devolvieron error al cargar (hotlink bloqueado, URL vencida…):
    // se ocultan para mostrar las iniciales en su lugar.
    failedPhotos = signal(new Set());
    markPhotoFailed(id) {
        if (!id)
            return;
        this.failedPhotos.update((ids) => new Set([...ids, id]));
    }
    especialidades = signal({});
    loadingSpecialties = signal(true);
    specialtiesError = signal('');
    constructor() {
        this.reloadRequests();
        this.loadEspecialidades();
    }
    reloadRequests() {
        const userId = this.auth.currentUser()?.id;
        if (userId) {
            const isProf = this.isProfessional();
            const keycloakId = this.auth.getKeycloakId();
            const aliasIds = keycloakId && keycloakId !== userId ? [keycloakId] : [];
            const options = isProf
                ? { rol: 'PROFESIONAL', tipo: 'RECIBIDAS', aliasIds }
                : { rol: 'CLIENTE', tipo: 'ENVIADAS', aliasIds };
            this.api.getMyRequests(userId, options).pipe(catchError((error) => {
                this.errorMessage.set(this.api.describeError(error, 'No se pudieron cargar tus solicitudes'));
                return of(null);
            })).subscribe((requests) => {
                // Pase lo que pase (lista o error) la carga terminó: se oculta el skeleton.
                this.loading.set(false);
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
        else {
            // Sin sesión no se pide nada: si no, el skeleton quedaría visible para siempre.
            this.loading.set(false);
        }
    }
    // ── Ficha del cliente (quién hace la solicitud) ──
    loadCliente(clienteId) {
        if (!clienteId || this.clientes()[clienteId] !== undefined)
            return;
        // marco como pendiente para no repetir llamadas
        this.clientes.update((prev) => ({ ...prev, [clienteId]: null }));
        this.api.getUserById(clienteId).pipe(catchError(() => of(null))).subscribe((cliente) => {
            if (cliente) {
                this.clientes.update((prev) => ({ ...prev, [clienteId]: cliente }));
            }
        });
    }
    clienteDe(request) {
        if (!request.clienteId)
            return null;
        return this.clientes()[request.clienteId] ?? null;
    }
    clienteNombre(request) {
        const c = this.clienteDe(request);
        if (!c)
            return request.clienteId ? 'Cliente Vincula-UP' : 'Cliente';
        const full = `${c.nombre ?? ''} ${c.apellido ?? ''}`.trim();
        return full || c.email || 'Cliente Vincula-UP';
    }
    // ── Ficha del profesional (a quién le pediste el turno) ──
    loadProfesional(profesionalId) {
        if (!profesionalId || this.profesionales()[profesionalId] !== undefined)
            return;
        // marcado como pendiente para no repetir llamadas
        this.profesionales.update((prev) => ({ ...prev, [profesionalId]: null }));
        this.api.getProfessionalById(profesionalId).pipe(catchError(() => of(null))).subscribe((prof) => {
            if (prof) {
                this.profesionales.update((prev) => ({ ...prev, [profesionalId]: prof }));
            }
        });
    }
    profesionalDe(request) {
        const key = request.professionalId;
        const cached = key ? this.profesionales()[key] ?? null : null;
        if (cached)
            return cached;
        // Las solicitudes viejas pueden guardar el id de perfil en vez del usuarioId
        // (o viceversa): si ya tenemos cargada la ficha bajo la otra clave, la
        // reutilizamos para no dejar el avatar sin foto.
        for (const prof of Object.values(this.profesionales())) {
            if (!prof)
                continue;
            if (prof.id === key || prof.usuarioId === key)
                return prof;
        }
        return null;
    }
    /**
     * Id del usuario dueño de la foto del profesional de la solicitud. La imagen la
     * pide el `vu-avatar` por su id (el backend controla si ese rol puede verla);
     * `null` cuando la ficha todavía no cargó o el profesional no tiene foto.
     */
    usuarioIdProfesional(request) {
        return this.profesionalDe(request)?.usuarioId ?? null;
    }
    tieneFotoProfesional(request) {
        return this.profesionalDe(request)?.tieneFoto === true;
    }
    profesionalNombre(request) {
        const p = this.profesionalDe(request);
        if (p) {
            const full = `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim();
            if (full)
                return full;
        }
        // Fallback: el nombre que traía la solicitud (evitando el genérico).
        const previo = (request.professionalName ?? '').trim();
        return previo && previo !== 'Profesional Vincula-UP' ? previo : 'Profesional';
    }
    // ── Especialidad (nombre real en vez de "Servicio técnico") ──
    loadEspecialidades() {
        this.loadingSpecialties.set(true);
        this.specialtiesError.set('');
        this.api.getSpecialtiesMap().pipe(catchError(() => {
            this.specialtiesError.set('No se pudieron cargar los nombres de las especialidades.');
            return of({});
        })).subscribe((m) => {
            this.especialidades.set(m ?? {});
            this.loadingSpecialties.set(false);
        });
    }
    especialidadNombre(request) {
        if (request.especialidadId && this.especialidades()[request.especialidadId]) {
            return this.especialidades()[request.especialidadId];
        }
        const name = request.specialty;
        const isCode = name === request.especialidadId || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(name || '')
            || /^Especialidad [0-9a-f]{8}/i.test(name || '');
        if (name && name !== 'Servicio técnico' && !isCode)
            return name;
        return this.loadingSpecialties() ? 'Cargando especialidad...' : 'Especialidad no disponible';
    }
    // ── Ubicación: dirección + mapa embebido OSM (sin exponer coordenadas) ──
    /** Coordenadas válidas solo para construir el mapa; nunca se muestran en el texto. */
    mapCoords(request) {
        const lat = Number(request.latitude);
        const lng = Number(request.longitude);
        if (request.latitude == null || request.longitude == null ||
            Number.isNaN(lat) || Number.isNaN(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null;
        }
        return { lat, lng };
    }
    /**
     * URL del mapa embebido de OpenStreetMap centrada en la ubicación del servicio.
     * Marca solo el punto (bbox pequeño alrededor); null si no hay coords válidas.
     */
    embeddedMapUrl(request) {
        const coords = this.mapCoords(request);
        if (!coords)
            return null;
        const key = `${coords.lat},${coords.lng}`;
        const cached = this._urlCache.get(key);
        if (cached)
            return cached;
        const delta = 0.008;
        const bbox = `${coords.lng - delta}%2C${coords.lat - delta}%2C${coords.lng + delta}%2C${coords.lat + delta}`;
        const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
        const safe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this._urlCache.set(key, safe);
        return safe;
    }
    /** Se dispara cuando el iframe termina de cargar sus tiles. */
    onMapaLoad() {
        this.mapaCargando.set(false);
    }
    isProfessional() {
        return this.auth.hasRole('PROFESIONAL');
    }
    /**
     * Mientras la solicitud está pendiente, el profesional ve la zona y no la
     * dirección exacta: el backend reemplaza el campo antes de que llegue acá.
     * El cliente también la ve siempre, pero no se le antepone la etiqueta de zona.
     */
    isPending(request) {
        return request.status === 'PENDIENTE';
    }
    isClient() {
        return this.auth.hasRole('CLIENTE');
    }
    /**
     * Estados a los que se puede llevar la solicitud con un mismo botón, según el rol
     * y el estado actual. Cliente y profesional comparten completar y cancelar.
     */
    estadosDisponibles(request) {
        const opciones = [];
        const esCliente = !this.isProfessional();
        if (esCliente && request.status === 'PENDIENTE') {
            opciones.push('CANCELADA');
        }
        if (this.isProfessional() && request.status === 'PENDIENTE') {
            opciones.push('ACEPTADA', 'RECHAZADA');
        }
        if (request.status === 'ACEPTADA') {
            // Completar y cancelar quedan para los dos lados.
            opciones.push('COMPLETADA', 'CANCELADA');
        }
        return opciones;
    }
    /** Un solo botón para cambiar el estado: abre el modal con las opciones válidas. */
    abrirActualizarEstado(request) {
        this.errorMessage.set('');
        this.motivoEstado.set('');
        this.estadoAConfirmar.set(null);
        this.motivoError.set('');
        this.updatingRequestId.set(String(request.id));
        this.statusDialogRef = this.dialog.open(this.statusDialog, {
            ariaLabel: 'Actualizar estado de la solicitud',
            ariaModal: true,
            maxWidth: 'min(32rem, calc(100vw - 2rem))',
            panelClass: 'vu-details-dialog',
        });
        this.statusDialogRef.afterClosed().subscribe(() => {
            this.statusDialogRef = undefined;
            this.resetEstadoDialog();
        });
    }
    /** Solicitud abierta en el modal de estado (o null). */
    solicitudDelModal = computed(() => {
        const id = this.updatingRequestId();
        return id ? (this.requests().find((request) => String(request.id) === id) ?? null) : null;
    });
    /** Nombre de la contraparte según quién mira la lista. */
    nombreContraparte(request) {
        return this.isProfessional() ? this.clienteNombre(request) : this.profesionalNombre(request);
    }
    etiquetaEstado(estado) {
        const textos = {
            ACEPTADA: 'Aceptar la solicitud',
            RECHAZADA: 'Rechazar la solicitud',
            COMPLETADA: 'Marcar como completada',
            CANCELADA: 'Cancelar la solicitud',
        };
        return textos[estado] ?? 'Actualizar';
    }
    iconoEstado(estado) {
        return estado === 'ACEPTADA' || estado === 'COMPLETADA' ? 'check' : 'x';
    }
    cerrarActualizarEstado() {
        this.statusDialogRef?.close();
        this.cancelDialogRef?.close();
        this.statusDialogRef = undefined;
        this.cancelDialogRef = undefined;
        this.resetEstadoDialog();
    }
    resetEstadoDialog() {
        this.updatingRequestId.set(null);
        this.motivoEstado.set('');
        this.estadoAConfirmar.set(null);
        this.motivoError.set('');
    }
    /**
     * Cualquier cambio de estado pide confirmación. La cancelación tiene su propio
     * paso (el motivo es obligatorio), y el resto —aceptar, rechazar o completar—
     * muestra la consecuencia antes de aplicarse.
     */
    elegirEstado(request, nuevo) {
        if (nuevo === 'CANCELADA') {
            this.estadoAConfirmar.set(nuevo);
            this.motivoEstado.set('');
            this.motivoError.set('');
            this.cancelDialogRef = this.dialog.open(this.cancelDialog, {
                ariaLabel: 'Motivo de la cancelación',
                ariaModal: true,
                maxWidth: 'min(32rem, calc(100vw - 2rem))',
                panelClass: 'vu-details-dialog',
            });
            this.cancelDialogRef.afterClosed().subscribe(() => {
                this.cancelDialogRef = undefined;
                if (this.estadoAConfirmar()) {
                    this.volverAEstadoOpciones();
                }
            });
            return;
        }
        this.confirmacionTransicion.set({ request, nuevo });
    }
    /** Aplica la transición elegida en el diálogo de confirmación. */
    confirmarTransicion() {
        const pendiente = this.confirmacionTransicion();
        if (!pendiente)
            return;
        this.confirmacionTransicion.set(null);
        this.cerrarActualizarEstado();
        this.aplicarEstado(pendiente.request, pendiente.nuevo);
    }
    /** Transición pendiente de confirmación (aceptar, rechazar o completar). */
    confirmacionTransicion = signal(null);
    /** Título y consecuencia de la transición elegida. */
    transicionTitulo() {
        const nuevo = this.confirmacionTransicion()?.nuevo;
        const titulos = {
            ACEPTADA: 'Aceptar la solicitud',
            RECHAZADA: 'Rechazar la solicitud',
            COMPLETADA: 'Marcar como completada',
        };
        return (nuevo && titulos[nuevo]) || 'Actualizar el estado';
    }
    transicionMensaje() {
        const pendiente = this.confirmacionTransicion();
        if (!pendiente)
            return '';
        const contraparte = this.nombreContraparte(pendiente.request);
        if (pendiente.nuevo === 'ACEPTADA') {
            return `¿Querés aceptar el turno de ${contraparte}?`;
        }
        if (pendiente.nuevo === 'RECHAZADA') {
            return `¿Querés rechazar el pedido de ${contraparte}?`;
        }
        return `¿Confirmás que el turno con ${contraparte} ya terminó?`;
    }
    transicionDetalle() {
        const nuevo = this.confirmacionTransicion()?.nuevo;
        if (nuevo === 'ACEPTADA') {
            return 'Queda confirmado el turno y se habilita el chat para coordinar con la contraparte.';
        }
        if (nuevo === 'RECHAZADA') {
            return 'La solicitud se cierra y el cliente puede buscar a otro profesional. No se puede volver atrás.';
        }
        return 'La solicitud se cierra como completada. Después se puede calificar el servicio.';
    }
    transicionIcono() {
        const nuevo = this.confirmacionTransicion()?.nuevo;
        return nuevo === 'ACEPTADA' || nuevo === 'COMPLETADA' ? 'check' : 'x';
    }
    transicionPeligrosa() {
        return this.confirmacionTransicion()?.nuevo === 'RECHAZADA';
    }
    /** Vuelve a la lista de opciones sin cerrar el modal. */
    volverAEstadoOpciones() {
        this.cancelDialogRef?.close();
        this.cancelDialogRef = undefined;
        this.estadoAConfirmar.set(null);
        this.motivoEstado.set('');
        this.motivoError.set('');
    }
    /** Confirma la cancelación: sin motivo no sale, la contraparte tiene que saber por qué. */
    confirmarCancelacion() {
        const solicitud = this.solicitudDelModal();
        if (!solicitud)
            return;
        if (!this.motivoEstado().trim()) {
            this.motivoError.set('Contale a la contraparte por qué cancelás.');
            return;
        }
        this.aplicarEstado(solicitud, 'CANCELADA');
    }
    aplicarEstado(request, nuevo) {
        const actorId = this.auth.currentUser()?.id;
        if (!actorId)
            return;
        const id = String(request.id);
        this.errorMessage.set('');
        // El motivo solo viaja en la cancelación (obligatorio para las dos partes).
        const motivo = this.motivoEstado().trim();
        const llamada = nuevo === 'COMPLETADA' ? this.api.completeRequest(id, actorId)
            : nuevo === 'CANCELADA' ? this.api.cancelRequest(id, actorId, motivo)
                : nuevo === 'RECHAZADA' ? this.api.rejectRequest(id, actorId, '')
                    : this.api.acceptRequest(id, actorId, '');
        llamada.pipe(catchError((error) => {
            this.errorMessage.set(this.api.describeError(error, 'No se pudo actualizar el estado de la solicitud'));
            return of(null);
        })).subscribe((updated) => {
            this.cerrarActualizarEstado();
            if (!updated)
                return;
            this.requestService.updateStatus(request.id, updated.status);
            this.notifications.markStatusHandledLocally(request.id, updated.status);
            this.successMessage.set(nuevo === 'COMPLETADA' ? 'La solicitud fue marcada como completada. ¡Ahora podés calificar el servicio!'
                : nuevo === 'CANCELADA' ? 'Cancelaste la solicitud. La contraparte ve el motivo que escribiste.'
                    : nuevo === 'RECHAZADA' ? 'Solicitud rechazada.'
                        : 'Solicitud aceptada. Podés comunicarte por el chat.');
            this.reloadRequests();
        });
    }
    // --- CHAT MODULE ---
    toggleChat(requestId) {
        const idStr = String(requestId);
        if (this.activeChatId() === idStr) {
            this.chatDialogRef?.close();
            this.chatDialogRef = undefined;
            this.activeChatId.set(null);
        }
        else {
            this.chatDialogRef?.close();
            this.activeChatId.set(idStr);
            this.loadMessages(idStr);
            this.chatDialogRef = this.dialog.open(this.chatDialog, {
                ariaLabel: 'Chat de la solicitud',
                ariaModal: true,
                maxWidth: 'min(36rem, calc(100vw - 2rem))',
                panelClass: 'vu-details-dialog',
            });
            this.chatDialogRef.afterClosed().subscribe(() => {
                this.chatDialogRef = undefined;
                this.activeChatId.set(null);
            });
        }
    }
    loadMessages(requestId) {
        const userId = this.auth.currentUser()?.id;
        if (!userId)
            return;
        this.api.getMessages(requestId, userId).pipe(catchError(() => of([]))).subscribe((msgs) => {
            this.chatMessages.update((prev) => ({
                ...prev,
                [requestId]: msgs ?? [],
            }));
        });
    }
    sendMessage(requestId) {
        const text = this.chatInput().trim();
        const userId = this.auth.currentUser()?.id;
        const idStr = String(requestId);
        if (!text || !userId)
            return;
        this.sendingChat.set(true);
        this.api.sendMessage(idStr, { emisorId: userId, texto: text }).pipe(catchError((error) => {
            this.errorMessage.set(this.api.describeError(error, 'No se pudo enviar el mensaje'));
            return of(null);
        })).subscribe((created) => {
            this.sendingChat.set(false);
            if (created) {
                this.chatInput.set('');
                this.loadMessages(idStr);
            }
        });
    }
    isOwnMessage(msg) {
        return msg.emisorId === this.auth.currentUser()?.id;
    }
    // --- RATING MODULE ---
    loadRating(requestId) {
        this.api.getRating(requestId).pipe(catchError(() => of(null))).subscribe((rating) => {
            this.ratings.update((prev) => ({
                ...prev,
                [requestId]: rating,
            }));
        });
    }
    setRating(requestId, score) {
        const idStr = String(requestId);
        this.ratingScore.update((prev) => ({ ...prev, [idStr]: score }));
    }
    getScore(requestId) {
        return this.ratingScore()[String(requestId)] || 5;
    }
    getRatingComment(requestId) {
        return this.ratingComment()[String(requestId)] || '';
    }
    setRatingComment(requestId, comment) {
        const idStr = String(requestId);
        this.ratingComment.update((prev) => ({ ...prev, [idStr]: comment }));
    }
    submitRating(request) {
        const reqId = String(request.id);
        const userId = this.auth.currentUser()?.id;
        if (!userId)
            return;
        const score = this.getScore(reqId);
        const comment = this.ratingComment()[reqId] || '';
        this.submittingRating.set(true);
        this.errorMessage.set('');
        this.api.createRating(reqId, userId, score, comment).pipe(catchError((error) => {
            this.errorMessage.set(this.api.describeError(error, 'No se pudo registrar la calificación'));
            return of(null);
        })).subscribe((res) => {
            this.submittingRating.set(false);
            if (res) {
                this.successMessage.set('¡Muchas gracias por calificar al profesional!');
                this.loadRating(reqId);
            }
        });
    }
    requestDateTime(request) {
        if (!request.date)
            return Number.MAX_SAFE_INTEGER;
        const time = request.time?.trim() ? request.time : '00:00';
        const parsed = new Date(`${request.date}T${time}`);
        const value = parsed.getTime();
        return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
    }
    createdTimestamp(request) {
        if (request.fechaCreacion) {
            const value = new Date(request.fechaCreacion).getTime();
            if (!Number.isNaN(value))
                return value;
        }
        const numericId = Number(request.id);
        if (!Number.isNaN(numericId) && numericId > 0)
            return numericId;
        return this.requestDateTime(request);
    }
    statusText(status) {
        return {
            PENDIENTE: 'Pendiente',
            ACEPTADA: 'Aceptada',
            RECHAZADA: 'Rechazada',
            COMPLETADA: 'Completada',
            CANCELADA: 'Cancelada',
            VENCIDA: 'Vencida',
        }[status] ?? status;
    }
    /**
     * Textos que el sistema generaba antes de que el motivo fuera obligatorio. No
     * los escribió ninguna persona, así que no se muestran como si fueran suyas.
     */
    MOTIVOS_GENERICOS = [
        'Cancelada por la contraparte',
        'No disponible para el horario o zona seleccionada',
    ];
    /**
     * Aclara quién dejó la solicitud en su estado final, según quién mira la lista:
     * el que canceló se lo ve como "vos" y el otro como la contraparte.
     * Las solicitudes canceladas antes de que se guardara el autor no permiten
     * atribuirlo, y en ese caso no se inventa quién fue.
     */
    cierreLabel(request) {
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
    motivoLegible(request) {
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
    horarioLabel(request) {
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
    activeRequest = computed(() => {
        const id = this.activeChatId();
        return id ? (this.requests().find((request) => String(request.id) === id) ?? null) : null;
    });
    /** Etiqueta del contador superior: cambia según quién mira la pantalla. */
    get pendingLabel() {
        return this.isProfessional() ? 'solicitudes pendientes' : 'solicitudes en revisión';
    }
    countPending() {
        return this.requests().filter((request) => request.status === 'PENDIENTE').length;
    }
    /** Clase del badge según el estado, con los colores del prototipo. */
    statusClass(status) {
        switch (status) {
            case 'PENDIENTE':
                return 'vu-badge--pendiente';
            case 'ACEPTADA':
                return 'vu-badge--aceptada';
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
};
__decorate([
    ViewChild('chatDialog')
], MyRequests.prototype, "chatDialog", void 0);
__decorate([
    ViewChild('statusDialog')
], MyRequests.prototype, "statusDialog", void 0);
__decorate([
    ViewChild('cancelDialog')
], MyRequests.prototype, "cancelDialog", void 0);
MyRequests = __decorate([
    Component({
        imports: [CommonModule, RouterLink, FormsModule, MatButtonModule, VuAvatar, VuConfirm, VuIcon, VuSkeletonList, VuSpinner],
        selector: 'app-my-requests',
        styleUrl: './my-requests.css',
        templateUrl: './my-requests.html',
    })
], MyRequests);
export { MyRequests };

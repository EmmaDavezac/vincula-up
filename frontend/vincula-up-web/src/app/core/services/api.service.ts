import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AdminRequest } from '../models/admin';
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
  motivoCancelacion?: string;
  /** Qué lado canceló el turno: "CLIENTE" o "PROFESIONAL". */
  canceladaPorRol?: 'CLIENTE' | 'PROFESIONAL' | null;
  fechaCreacion: string;
  fechaCambioEstado: string;
  latitud?: number | null;
  longitud?: number | null;
  /** Fin del turno: el horario de una solicitud es un rango. */
  fechaHoraFinPropuesta?: string | null;
  /** Resumen del problema que escribe el cliente. */
  descripcion?: string | null;
}

export interface ClienteInfo {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  /** Clave del archivo de la foto en el servidor, no una URL. */
  fotoUrl?: string | null;
  /** Si el cliente tiene foto guardada (lo deriva el frontend de esa clave). */
  tieneFoto?: boolean;
  fechaAlta?: string;
}

export interface UserAccount {
  id: string;
  keycloakId?: string | null;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  /** Clave del archivo de la foto en el servidor, no una URL. La imagen se pide
   *  por `/api/usuarios/{id}/foto`, que exige sesión y controla el rol. */
  fotoUrl?: string | null;
  /** Si tiene foto guardada: es lo que el `vu-avatar` necesita para pedirla. */
  tieneFoto?: boolean;
  rolNegocio: string;
  estado?: string;
  fechaAlta?: string;
}

export interface UserAccountUpdate {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  fotoUrl?: string | null;
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

export interface GpsPosition {
  address: string;
  latitude: number | null;
  longitude: number | null;
  latitud?: number | null;
  longitud?: number | null;
  source: string;
  resolved?: boolean;
  error?: string;
}

export interface ReputationReview {
  puntaje: number;
  comentario?: string | null;
  fecha?: string;
  clienteNombre?: string;
}

export interface MyReputation {
  promedio: number;
  cantidad: number;
  resenas: ReputationReview[];
}

/** Resultado del alta de un profesional desde el panel de administración. */
export interface AltaProfesionalResultado {
  usuario: { id: string };
  profesional: { id: string; legajo: string };
  /** Si el aviso por correo salió. Si es `false`, hay que avisarle por otra vía. */
  correoEnviado: boolean;
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

  getProfessionals(status = 'ACTIVO', todos = false): Observable<Professional[]> {
    let params = new HttpParams();
    if (todos) {
      params = params.set('todos', 'true');
    } else if (status) {
      params = params.set('estado', status);
    }
    return this.http.get<Array<Record<string, unknown>>>(`${this.baseUrl}/profesionales`, { params, headers: this.authHeaders() }).pipe(
      map((items) => (items ?? []).map((raw) => this.mapProfessionalProfile(raw))),
    );
  }

  /**
   * Ficha individual del profesional (id de perfil o usuarioId) para la
   * tarjeta de la solicitud: nombre real, especialidad y foto, ya enriquecida
   * por el BFF. Devuelve null si el perfil no existe (solicitud histórica).
   */
  getProfessionalById(id: string): Observable<Professional | null> {
    if (!id) return of(null);
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/profesionales/${id}`, { headers: this.authHeaders() }).pipe(
      map((raw) => this.mapProfessionalProfile(raw)),
      catchError(() => of(null)),
    );
  }

  /** Número del backend, tolerante a null o a un valor que no sea número. */
  private numero(valor: unknown): number {
    const n = typeof valor === 'number' ? valor : Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  /** Normaliza la ficha del profesional al modelo que usa la UI. */
  private mapProfessionalProfile(raw: Record<string, unknown>): Professional {
    const nombre = typeof raw['nombre'] === 'string' ? (raw['nombre'] as string).trim() : '';
    const apellido = typeof raw['apellido'] === 'string' ? (raw['apellido'] as string).trim() : '';
    const realName = `${nombre} ${apellido}`.trim();
    const legajo = typeof raw['legajo'] === 'string' ? (raw['legajo'] as string) : '';
    const especialidades = Array.isArray(raw['especialidades'])
      ? (raw['especialidades'] as Array<Record<string, unknown>>)
          .filter((item) => item && typeof item['nombre'] === 'string')
          .map((item) => ({ id: String(item['id'] ?? ''), nombre: String(item['nombre']) }))
      : [];
    const name = realName || (legajo ? `Profesional ${legajo}` : 'Profesional Vincula-UP');
    const initials = realName
      ? realName.split(/\s+/).slice(0, 2).map((parte) => parte.charAt(0).toUpperCase()).join('')
      : 'P';
    return {
      id: String(raw['id'] ?? ''),
      name,
      specialty: especialidades.map((item) => item.nombre).join(' / ') || 'Servicio técnico',
      zone: raw['zonaCoberturaLat'] != null && raw['zonaCoberturaLng'] != null
        ? 'Zona de cobertura activa'
        : 'Zona no informada',
      // La reputación llega calculada desde el backend (promedio y cantidad de
      // reseñas). Antes venía fija en 0 y ninguna tarjeta mostraba estrellas.
      rating: this.numero(raw['promedio']),
      reviews: this.numero(raw['cantidadCalificaciones']),
      availability: 'Consultar disponibilidad',
      initials,
      accent: 'sky',
      usuarioId: raw['usuarioId'] ? String(raw['usuarioId']) : undefined,
      legajo: legajo || undefined,
      nombre: nombre || null,
      apellido: apellido || null,
      especialidades,
      // La foto no viene como URL: el backend manda solo el booleano y el
      // `vu-avatar` pide la imagen por `/api/usuarios/{usuarioId}/foto`.
      tieneFoto: raw['tieneFoto'] === true,
      estado: typeof raw['estado'] === 'string' ? (raw['estado'] as string) : 'ACTIVO',
      // Zona de cobertura: sin estos datos el directorio no puede calcular la
      // distancia ni el asistente ordenar por proximidad.
      zonaCoberturaLat: this.numeroONull(raw['zonaCoberturaLat']),
      zonaCoberturaLng: this.numeroONull(raw['zonaCoberturaLng']),
      radioKm: this.numeroONull(raw['radioKm']),
    };
  }

  /** Número o null si el backend no lo mandó (para no perder "no informado"). */
  private numeroONull(valor: unknown): number | null {
    if (valor == null) return null;
    const n = typeof valor === 'number' ? valor : Number(valor);
    return Number.isFinite(n) ? n : null;
  }

  saveSpecialty(id: string | null, nombre: string): Observable<unknown> {
    const options = { headers: this.authHeaders() };
    return id ? this.http.put(`${this.baseUrl}/especialidades/${id}`, { nombre }, options)
      : this.http.post(`${this.baseUrl}/especialidades`, { nombre }, options);
  }

  deleteSpecialty(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/especialidades/${id}`, { headers: this.authHeaders() });
  }

  /**
   * Edición del padrón: ms-profesionales sólo valida {@code usuarioId},
   * {@code legajo} y {@code especialidadIds} (los datos personales viven en
   * ms-usuarios), así que el resto de los campos es opcional y no se envía.
   */
  updateProfessional(id: string, request: {
    usuarioId: string;
    legajo: string;
    especialidadIds: string[];
    nombre?: string;
    apellido?: string;
    email?: string;
    telefono?: string;
  }): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/profesionales/${id}`, request, { headers: this.authHeaders() });
  }

  /**
   * El padrón de profesionales no se borra: la baja es lógica (suspender). Para darlo de baja
   * se usa `suspendProfessional`; no existe borrado físico ni en el microservicio ni acá.
   */

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
    keycloakId?: string;
    fotoUrl: string;
    zonaCoberturaLat: number;
    zonaCoberturaLng: number;
    radioKm: number;
  }): Observable<ProfessionalActivationResponse> {
    return this.http.patch<ProfessionalActivationResponse>(`${this.baseUrl}/profesionales/activar`, request, { headers: this.authHeaders() });
  }

  getMyProfessionalProfile(usuarioId: string, keycloakId?: string | null): Observable<ProfessionalActivationResponse | null> {
    let params = new HttpParams().set('usuarioId', usuarioId);
    if (keycloakId) {
      params = params.set('keycloakId', keycloakId);
    }
    return this.http.get<ProfessionalActivationResponse>(`${this.baseUrl}/profesionales/mi-perfil`, {
      params,
      headers: this.authHeaders(),
    }).pipe(
      catchError(() => of(null)),
    );
  }

  setAvailability(professionalId: string, slots: AvailabilitySlot[]): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/profesionales/${professionalId}/disponibilidad`, slots, { headers: this.authHeaders() });
  }

  suspendProfessional(id: string): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/profesionales/${id}/suspender`, {}, { headers: this.authHeaders() });
  }

  reactivateProfessional(id: string): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/profesionales/${id}/reactivar`, {}, { headers: this.authHeaders() });
  }

  getUsers(role?: string, estado?: string): Observable<Array<{ id: string; nombre: string; apellido: string; email: string; telefono?: string; fotoUrl?: string; rolNegocio: string; estado?: string; keycloakId?: string | null }>> {
    let params = new HttpParams();
    if (role) {
      params = params.set('rol', role);
    }
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Array<{ id: string; nombre: string; apellido: string; email: string; telefono?: string; tieneFoto?: boolean; rolNegocio: string; estado?: string; keycloakId?: string | null }>>(`${this.baseUrl}/usuarios`, { params, headers: this.authHeaders() });
  }

  /**
   * Alta de un profesional con sus datos: guarda el prerregistro y el perfil
   * pendiente de activación, y le manda al profesional las instrucciones.
   *
   * <p>El backend rechaza con 409 si el correo ya tiene una cuenta: el prerregistro
   * es solo para direcciones que todavía no se registraron. `correoEnviado` dice si
   * el aviso salió, para que el panel no dé por hecho que el profesional se enteró.
   */
  createProfessionalInvite(request: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    legajo: string;
    especialidadIds: string[];
  }): Observable<AltaProfesionalResultado> {
    return this.http.post<AltaProfesionalResultado>(`${this.baseUrl}/profesionales/alta`, request, { headers: this.authHeaders() });
  }

  /**
   * Actualiza los datos de un usuario desde el panel. Lo usa el detalle del
   * cliente. El email no viaja: es la identidad con la que se vincula la cuenta.
   */
  updateUser(id: string, request: { nombre?: string; apellido?: string; telefono?: string }): Observable<UserAccount> {
    return this.http.patch<UserAccount>(`${this.baseUrl}/usuarios/${id}`, request, { headers: this.authHeaders() });
  }

  /** Baneo administrativo de una cuenta (clientes incluidos). */
  suspendUser(id: string): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/usuarios/${id}/suspender`, {}, { headers: this.authHeaders() });
  }

  /** Levanta el baneo de una cuenta y la devuelve a ACTIVO. */
  reactivateUser(id: string): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/usuarios/${id}/reactivar`, {}, { headers: this.authHeaders() });
  }

  getUserById(id: string): Observable<ClienteInfo | null> {
    if (!id) return of(null);
    return this.http.get<ClienteInfo>(`${this.baseUrl}/usuarios/${id}`, { headers: this.authHeaders() }).pipe(
      // La foto llega como clave del archivo, no como URL: de ahí se deriva si
      // hay foto. La imagen la pide el `vu-avatar` por su endpoint, que exige
      // sesión y controla la visibilidad por rol.
      map((usuario) => ({
        ...usuario,
        tieneFoto: Boolean(usuario?.fotoUrl && usuario.fotoUrl.trim().length > 0),
      })),
    );
  }

  /**
   * Perfil propio ("Mi cuenta"). El BFF resuelve el id desde el token: el
   * email se ignora siempre (no se cambia desde el perfil).
   */
  /**
   * Reputación del profesional autenticado: promedio y las reseñas recibidas con
   * el nombre de quien las dejó. El backend la resuelve desde la sesión, así que
   * no se puede pedir la de otro profesional.
   */
  getMyReputation(): Observable<MyReputation> {
    return this.http.get<MyReputation>(`${this.baseUrl}/mi-reputacion`, { headers: this.authHeaders() });
  }

  getMyAccount(): Observable<UserAccount> {
    return this.http.get<UserAccount>(`${this.baseUrl}/usuarios/yo`, { headers: this.authHeaders() });
  }

  updateMyAccount(request: UserAccountUpdate): Observable<UserAccount> {
    return this.http.patch<UserAccount>(`${this.baseUrl}/usuarios/yo`, request, { headers: this.authHeaders() });
  }

  getSpecialtiesMap(): Observable<Record<string, string>> {
    return this.http.get<Array<{ id: string; nombre: string }>>(`${this.baseUrl}/especialidades`, { headers: this.authHeaders() }).pipe(
      map((items) => {
        const m: Record<string, string> = {};
        for (const it of items ?? []) {
          if (it?.id && it?.nombre) m[it.id] = it.nombre;
        }
        return m;
      }),
    );
  }

  getAvailability(professionalId: string): Observable<AvailabilitySlot[]> {
    return this.http.get<AvailabilitySlot[]>(`${this.baseUrl}/profesionales/${professionalId}/disponibilidad`, { headers: this.authHeaders() });
  }

  createRequest(request: {
    clienteId: string;
    profesionalId: string;
    especialidadId: string;
    direccionServicio: string;
    latitud: number;
    longitud: number;
    fechaHoraPropuesta: string;
    /** Fin del turno: el horario que se muestra es un rango. */
    fechaHoraFinPropuesta?: string | null;
    /** Obligatorio: es lo que le dice al profesional qué tiene que resolver. */
    descripcion: string;
  }): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.baseUrl}/solicitudes`, request, { headers: this.authHeaders() });
  }

  getMyRequests(
    userId: string,
    options?: { aliasIds?: string[]; tipo?: 'RECIBIDAS' | 'ENVIADAS'; rol?: string },
  ): Observable<ServiceRequest[]> {
    let params = new HttpParams().set('usuarioId', userId);
    if (options?.tipo) {
      params = params.set('tipo', options.tipo);
    }
    if (options?.rol) {
      params = params.set('rol', options.rol);
    }
    if (options?.aliasIds && options.aliasIds.length > 0) {
      for (const alias of options.aliasIds) {
        if (alias) {
          params = params.append('aliasIds', alias);
        }
      }
    }
    return this.http.get<BackendRequest[]>(`${this.baseUrl}/solicitudes/mias`, { params, headers: this.authHeaders() }).pipe(
      map((items) => items.map((item) => this.toServiceRequest(item))),
    );
  }

  /**
   * Solicitudes de toda la plataforma para los indicadores del panel de administración
   * (`/solicitudes/panel`, restringido al rol ADMIN en el BFF).
   */
  getAdminRequests(): Observable<AdminRequest[]> {
    return this.http.get<AdminRequest[]>(`${this.baseUrl}/solicitudes/panel`, { headers: this.authHeaders() });
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

  cancelRequest(requestId: string, actorId: string, motivo = ''): Observable<ServiceRequest> {
    return this.http.patch<ServiceRequest>(`${this.baseUrl}/solicitudes/${requestId}/cancelar`, { actorId, motivo }, { headers: this.authHeaders() }).pipe(
      map((request) => this.toServiceRequest(request)),
    );
  }

  createRating(requestId: string, clienteId: string, puntaje: number, comentario = ''): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/solicitudes/${requestId}/calificacion`, { clienteId, puntaje, comentario }, { headers: this.authHeaders() });
  }

  getRating(requestId: string): Observable<{ id: string; solicitudId: string; puntaje: number; comentario: string } | null> {
    return this.http.get<{ id: string; solicitudId: string; puntaje: number; comentario: string }>(`${this.baseUrl}/solicitudes/${requestId}/calificacion`, { headers: this.authHeaders() });
  }

  getGpsPosition(address = ''): Observable<GpsPosition> {
    const params = new HttpParams().set('direccion', address);
    return this.http.get<GpsPosition>(`${this.baseUrl}/gps`, { params, headers: this.authHeaders() });
  }

  /**
   * Sube una foto al almacenamiento y devuelve su clave.
   * <p>
   * Va como archivo binario, no como data URL en base64: la base multiplicaba
   * el peso por ~1,3 y obligaba a agrandar el límite de body de nginx. En la base
   * de datos queda solo la clave, y la imagen se sirve por
   * `/api/usuarios/{id}/foto` (que exige sesión y controla el rol).
   */
  uploadPhoto(file: File): Observable<{ key: string }> {
    const form = new FormData();
    form.append('archivo', file, file.name);
    // Sin Content-Type explícito: el navegador debe poner el boundary del
    // multipart. Forzarlo a application/json rompe el envío.
    return this.http.post<{ key: string }>(`${this.baseUrl}/fotos`, form, {
      headers: this.authHeaders(),
    });
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

    let rawPayloadMessage = '';
    let rawPayloadError = '';
    const errorPayload = typeof error === 'object' && error && 'error' in error
      ? (error as { error?: unknown }).error
      : undefined;

    if (typeof errorPayload === 'object' && errorPayload !== null) {
      const payloadRecord = errorPayload as { message?: unknown; error?: unknown };
      rawPayloadMessage = typeof payloadRecord.message === 'string' ? payloadRecord.message : '';
      rawPayloadError = typeof payloadRecord.error === 'string' ? payloadRecord.error : '';
    } else if (typeof errorPayload === 'string') {
      rawPayloadMessage = errorPayload;
    }

    const clean = (value: string): string => value
      .replace(/^Http failure response for .*?:\s*/i, '')
      .replace(/\bNot Found\b/i, 'No encontrado')
      .replace(/\bUnauthorized\b/i, 'No autorizado')
      .replace(/\bForbidden\b/i, 'Prohibido')
      .replace(/\bConflict\b/i, 'Conflicto')
      .trim();

    const pickMessage = (...candidates: string[]): string => {
      for (const candidate of candidates) {
        const cleaned = clean(candidate);
        if (cleaned.length > 0 && !/^409\s*(conflicto)?$/i.test(cleaned)) {
          return cleaned;
        }
      }
      return '';
    };

    const message = pickMessage(rawPayloadMessage, rawMessage, rawPayloadError);

    if (status === 403 || /forbidden|denied|permiso|prohibido/i.test(message)) {
      return 'No tenés permiso para realizar esta acción.';
    }
    if (status === 404 || /no encontrado|not found|resource/i.test(message)) {
      return 'La solicitud o el recurso ya no está disponible.';
    }
    if (status === 409 || /conflict|estado|ya está en un estado/i.test(message)) {
      if (message) {
        return message.charAt(0).toUpperCase() + message.slice(1);
      }
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
    const prev = request as ServiceRequest;
    return {
      id: backend.id ?? prev.id ?? Date.now(),
      clienteId: backend.clienteId ?? prev.clienteId,
      professionalId: backend.profesionalId ?? prev.professionalId ?? '',
      professionalName: prev.professionalName ?? 'Profesional Vincula-UP',
      specialty: prev.specialty ?? 'Servicio técnico',
      date: backend.fechaHoraPropuesta ? this.parseDate(backend.fechaHoraPropuesta) : prev.date ?? '',
      time: backend.fechaHoraPropuesta ? this.parseTime(backend.fechaHoraPropuesta) : prev.time ?? '',
      timeEnd: backend.fechaHoraFinPropuesta ? this.parseTime(backend.fechaHoraFinPropuesta) : prev.timeEnd ?? '',
      address: backend.direccionServicio ?? prev.address ?? '',
      latitude: backend.latitud != null ? Number(backend.latitud) : prev.latitude ?? null,
      longitude: backend.longitud != null ? Number(backend.longitud) : prev.longitude ?? null,
      status: this.normalizeStatus(backend.estado ?? prev.status ?? 'PENDIENTE'),
      motivoCancelacion: backend.motivoCancelacion ?? prev.motivoCancelacion,
      canceladaPorRol: backend.canceladaPorRol ?? prev.canceladaPorRol,
      description: backend.descripcion ?? prev.description ?? '',
      especialidadId: backend.especialidadId ?? prev.especialidadId,
      fechaCreacion: backend.fechaCreacion ?? prev.fechaCreacion,
      fechaCambioEstado: backend.fechaCambioEstado ?? prev.fechaCambioEstado,
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

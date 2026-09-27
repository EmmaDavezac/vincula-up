export type RequestStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'COMPLETADA' | 'CANCELADA' | 'VENCIDA';

export interface ServiceRating {
  puntaje: number;
  comentario?: string;
  fechaCalificacion?: string;
}

export interface ServiceRequest {
  id: number | string;
  clienteId?: string;
  professionalId: string;
  professionalName: string;
  specialty: string;
  date: string;
  time: string;
  /** Fin del turno: el horario siempre es un rango (por ejemplo 08:00 a 12:00). */
  timeEnd?: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: RequestStatus;
  motivoCancelacion?: string;
  /**
   * Qué lado canceló el turno. Viene del backend para no dejar un texto genérico:
   * cada parte tiene que ver si canceló ella o la contraparte.
   */
  canceladaPorRol?: 'CLIENTE' | 'PROFESIONAL' | null;
  /** Resumen del problema que escribe el cliente: obligatorio al crear la solicitud. */
  description?: string;
  calificacion?: ServiceRating;
  distanciaMetros?: number;
  especialidadId?: string;
  fechaCreacion?: string;
  fechaCambioEstado?: string;
}

export function emptyServiceRequest(partial?: Partial<ServiceRequest>): ServiceRequest {
  return {
    id: partial?.id ?? '',
    clienteId: partial?.clienteId,
    professionalId: partial?.professionalId ?? '',
    professionalName: partial?.professionalName ?? '',
    specialty: partial?.specialty ?? '',
    date: partial?.date ?? '',
    time: partial?.time ?? '',
    timeEnd: partial?.timeEnd ?? '',
    address: partial?.address ?? '',
    latitude: partial?.latitude ?? null,
    longitude: partial?.longitude ?? null,
    status: partial?.status ?? 'PENDIENTE',
    motivoCancelacion: partial?.motivoCancelacion,
    canceladaPorRol: partial?.canceladaPorRol,
    description: partial?.description ?? '',
    calificacion: partial?.calificacion,
    distanciaMetros: partial?.distanciaMetros,
    especialidadId: partial?.especialidadId,
    fechaCreacion: partial?.fechaCreacion,
    fechaCambioEstado: partial?.fechaCambioEstado,
  };
}

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
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: RequestStatus;
  motivoCancelacion?: string;
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
    address: partial?.address ?? '',
    latitude: partial?.latitude ?? null,
    longitude: partial?.longitude ?? null,
    status: partial?.status ?? 'PENDIENTE',
    motivoCancelacion: partial?.motivoCancelacion,
    calificacion: partial?.calificacion,
    distanciaMetros: partial?.distanciaMetros,
    especialidadId: partial?.especialidadId,
    fechaCreacion: partial?.fechaCreacion,
    fechaCambioEstado: partial?.fechaCambioEstado,
  };
}

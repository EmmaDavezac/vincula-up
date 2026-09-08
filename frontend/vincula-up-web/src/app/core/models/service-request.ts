export type RequestStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'COMPLETADA' | 'CANCELADA' | 'VENCIDA';

export interface ServiceRequest {
  id: number | string;
  professionalId: string;
  professionalName: string;
  specialty: string;
  date: string;
  time: string;
  address: string;
  status: RequestStatus;
}

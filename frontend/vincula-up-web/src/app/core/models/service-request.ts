export type RequestStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export interface ServiceRequest {
  id: number;
  professionalId: number;
  professionalName: string;
  specialty: string;
  date: string;
  time: string;
  address: string;
  status: RequestStatus;
}

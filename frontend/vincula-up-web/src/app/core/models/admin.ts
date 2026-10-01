import type { VuIconName } from '../../shared/icon/icon';

/** Especialidad del catálogo administrable desde el panel. */
export interface AdminSpecialty {
	id: string;
	nombre: string;
}

/**
 * Ficha del padrón. El BFF ya agrega nombre, apellido y foto (viven en ms-usuarios),
 * así que el panel no necesita un segundo cruce de datos para mostrarlos.
 */
export interface AdminProfessional {
	id: string;
	usuarioId: string;
	legajo: string;
	estado: string;
	especialidades: AdminSpecialty[];
	nombre?: string | null;
	apellido?: string | null;
	/** Si el perfil del padrón tiene foto (respaldo de la de la cuenta). */
	tieneFoto?: boolean;
}

/** Usuario del padrón (profesional invitado o registrado) o cliente, con su estado. */
export interface AdminUser {
	id: string;
	nombre: string;
	apellido: string;
	email: string;
	telefono?: string;
	/**
	 * Si la persona tiene foto de perfil. La imagen no viaja como URL: el
	 * `vu-avatar` la pide por `/api/usuarios/{id}/foto`, que exige sesión y
	 * controla la visibilidad por rol.
	 */
	tieneFoto?: boolean;
	rolNegocio: string;
	estado?: string;
	keycloakId?: string | null;
	fechaAlta?: string;
}

/**
 * Solicitud en la vista del panel (`/solicitudes/panel`): sólo los datos que alimentan
 * los indicadores. No incluye la dirección del cliente ni el chat de la solicitud.
 */
export interface AdminRequest {
	id: string;
	clienteId: string;
	profesionalId: string;
	especialidadId: string;
	estado: string;
	puntaje: number | null;
	fechaHoraPropuesta?: string;
	fechaCreacion?: string;
	fechaCambioEstado?: string;
}

/** Ficha de detalle (modal "Consultar") del panel: profesional o cliente. */
export interface AdminUserDetail extends AdminUser {
	legajo?: string;
	especialidades?: AdminSpecialty[];
}

// ── Presentación (compartida por las cuatro pantallas del panel) ────────────

/** Estados del padrón tal como los usa el panel. */
export const PENDIENTE_ACTIVACION = 'CARGADO';

/** Nombre legible de una persona, con el email como respaldo. */
export function nombreCompleto(usuario: { nombre?: string | null; apellido?: string | null; email?: string | null }): string {
	const nombre = `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim();
	return nombre || usuario.email || 'Sin datos';
}

/**
 * Iniciales para el avatar de respaldo. Vive en `core/utils/avatar.ts` porque las
 * usan la navbar, el panel y el resto de las pantallas.
 */
export { inicialesDe } from '../utils/avatar';

/** Sólo se muestra la foto si el backend devolvió una imagen real (data URL). */
export function fotoMostrable(foto: string | null | undefined): string | null {
	return foto && foto.startsWith('data:') ? foto : null;
}

/** Etiqueta del estado del padrón o de la cuenta. */
export function estadoLabel(estado: string | null | undefined): string {
	const value = (estado ?? '').toUpperCase();
	if (!value) {
		return 'SIN ESTADO';
	}
	// CARGADO es el perfil que el admin cargó y el profesional todavía no activó.
	return value === PENDIENTE_ACTIVACION ? 'PENDIENTE DE ACTIVACIÓN' : value;
}

/**
 * Clase del estado con los colores exactos del prototipo:
 * verde activo, ámbar preregistro, rojo suspendido e inactivo (clientes baneados).
 */
export function estadoClase(estado: string | null | undefined): string {
	switch ((estado ?? '').toUpperCase()) {
		case 'ACTIVO':
			return 'vu-state--activo';
		case 'SUSPENDIDO':
			return 'vu-state--suspendido';
		case PENDIENTE_ACTIVACION:
			return 'vu-state--preregistro';
		default:
			return 'vu-state--inactivo';
	}
}

/** Nombres de las especialidades de un profesional. */
export function especialidadesLabel(especialidades: AdminSpecialty[] | null | undefined): string {
	const nombres = especialidades?.map((item) => item.nombre) ?? [];
	return nombres.length > 0 ? nombres.join(', ') : 'Sin especialidad';
}

/**
 * Aviso del panel. Antes todo se pintaba igual (`vu-alert--info`), y un error
 * quedaba visualmente indistinguible de un éxito: cada outcome lleva su tipo.
 */
export type AdminAviso = { texto: string; tipo: 'exito' | 'error' | 'info' };

/**
 * Acción pendiente de confirmación. Se arma con el closure que hay que ejecutar,
 * así cada pantalla declara su pregunta y su consecuencia sin repetir el diálogo.
 */
export interface AdminConfirmacion {
  titulo: string;
  mensaje: string;
  /** Consecuencia relevante de la acción. */
  detalle?: string;
  /** Texto del botón que confirma, con la acción nombrada. */
  confirmar?: string;
  /** Acción destructiva: botón en rojo y foco inicial en "Cancelar". */
  peligro?: boolean;
  icono?: VuIconName;
  ejecutar: () => void;
}

export function avisoExito(texto: string): AdminAviso {
  return { texto, tipo: 'exito' };
}

export function avisoError(texto: string): AdminAviso {
  return { texto, tipo: 'error' };
}

/** Clase del `vu-alert` según el tipo de aviso. */
export function avisoClase(tipo: AdminAviso['tipo']): string {
  return tipo === 'exito' ? 'vu-alert--success' : tipo === 'error' ? 'vu-alert--error' : 'vu-alert--info';
}

/**
 * Texto normalizado para buscar: minúsculas y sin acentos, para que "gasista",
 * "Gasista" y "gásista" encuentre lo mismo.
 */
export function normalizarBusqueda(texto: string | null | undefined): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * ¿Alguno de los textos indicados contiene lo buscado? Sin consulta activa
 * coincide todo, así que el filtro no cambia la lista mientras el campo está vacío.
 */
export function coincideBusqueda(consulta: string, ...textos: Array<string | null | undefined>): boolean {
  const q = normalizarBusqueda(consulta).trim();
  if (!q) {
    return true;
  }
  return textos.some((texto) => normalizarBusqueda(texto).includes(q));
}

/** Agrega o quita un id preservando el orden del resto. */
export function alternarId(ids: string[], id: string): string[] {
  const actuales = new Set(ids);
	if (actuales.has(id)) {
		actuales.delete(id);
	} else {
		actuales.add(id);
	}
	return [...actuales];
}
// ── Presentación (compartida por las cuatro pantallas del panel) ────────────
/** Estados del padrón tal como los usa el panel. */
export const PENDIENTE_ACTIVACION = 'CARGADO';
/** Nombre legible de una persona, con el email como respaldo. */
export function nombreCompleto(usuario) {
    const nombre = `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim();
    return nombre || usuario.email || 'Sin datos';
}
/**
 * Iniciales para el avatar de respaldo. Vive en `core/utils/avatar.ts` porque las
 * usan la navbar, el panel y el resto de las pantallas.
 */
export { inicialesDe } from '../utils/avatar';
/** Sólo se muestra la foto si el backend devolvió una imagen real (data URL). */
export function fotoMostrable(foto) {
    return foto && foto.startsWith('data:') ? foto : null;
}
/** Etiqueta del estado del padrón o de la cuenta. */
export function estadoLabel(estado) {
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
export function estadoClase(estado) {
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
export function especialidadesLabel(especialidades) {
    const nombres = especialidades?.map((item) => item.nombre) ?? [];
    return nombres.length > 0 ? nombres.join(', ') : 'Sin especialidad';
}
export function avisoExito(texto) {
    return { texto, tipo: 'exito' };
}
export function avisoError(texto) {
    return { texto, tipo: 'error' };
}
/** Clase del `vu-alert` según el tipo de aviso. */
export function avisoClase(tipo) {
    return tipo === 'exito' ? 'vu-alert--success' : tipo === 'error' ? 'vu-alert--error' : 'vu-alert--info';
}
/**
 * Texto normalizado para buscar: minúsculas y sin acentos, para que "gasista",
 * "Gasista" y "gásista" encuentre lo mismo.
 */
export function normalizarBusqueda(texto) {
    return (texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
/**
 * ¿Alguno de los textos indicados contiene lo buscado? Sin consulta activa
 * coincide todo, así que el filtro no cambia la lista mientras el campo está vacío.
 */
export function coincideBusqueda(consulta, ...textos) {
    const q = normalizarBusqueda(consulta).trim();
    if (!q) {
        return true;
    }
    return textos.some((texto) => normalizarBusqueda(texto).includes(q));
}
/** Agrega o quita un id preservando el orden del resto. */
export function alternarId(ids, id) {
    const actuales = new Set(ids);
    if (actuales.has(id)) {
        actuales.delete(id);
    }
    else {
        actuales.add(id);
    }
    return [...actuales];
}

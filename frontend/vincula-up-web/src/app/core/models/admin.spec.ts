import { describe, expect, it } from 'vitest';
import {
	AdminProfessional,
	AdminSpecialty,
	AdminUserDetail,
	alternarId,
	estadoClase,
	estadoLabel,
	especialidadesLabel,
	fotoMostrable,
	inicialesDe,
	nombreCompleto,
} from './admin';

/** Presentación compartida por las cuatro pantallas del panel de administración. */
describe('modelos del panel de administración', () => {
	it('arma el nombre completo con el email como respaldo', () => {
		expect(nombreCompleto({ nombre: 'Sofía', apellido: 'Martínez' })).toBe('Sofía Martínez');
		expect(nombreCompleto({ nombre: '', apellido: '', email: 'sofia@vincula-up.local' })).toBe('sofia@vincula-up.local');
		expect(nombreCompleto({})).toBe('Sin datos');
	});

	it('saca iniciales para el avatar de respaldo', () => {
		expect(inicialesDe('Lucía Benítez')).toBe('LB');
		expect(inicialesDe('Ana María Díaz Soto')).toBe('AM');
		expect(inicialesDe('')).toBe('P');
	});

	it('sólo muestra la foto cuando el backend devolvió una imagen real', () => {
		expect(fotoMostrable('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
		expect(fotoMostrable('https://i.pravatar.cc/160?img=12')).toBeNull();
		expect(fotoMostrable(null)).toBeNull();
	});

	it('traduce los estados del padrón a la etiqueta del panel', () => {
		expect(estadoLabel('ACTIVO')).toBe('ACTIVO');
		expect(estadoLabel('CARGADO')).toBe('PENDIENTE DE ACTIVACIÓN');
		expect(estadoLabel(undefined)).toBe('SIN ESTADO');
	});

	it('usa los colores del prototipo según el estado', () => {
		expect(estadoClase('ACTIVO')).toBe('vu-state--activo');
		expect(estadoClase('CARGADO')).toBe('vu-state--preregistro');
		expect(estadoClase('SUSPENDIDO')).toBe('vu-state--suspendido');
		expect(estadoClase('OTRO')).toBe('vu-state--inactivo');
	});

	it('agrega y quita especialidades sin perder el resto', () => {
		expect(alternarId(['e1'], 'e2')).toEqual(['e1', 'e2']);
		expect(alternarId(['e1', 'e2'], 'e1')).toEqual(['e2']);
		expect(alternarId([], 'e1')).toEqual(['e1']);
	});

	it('resume las especialidades de un profesional', () => {
		const especialidades: AdminSpecialty[] = [{ id: 'e1', nombre: 'Electricidad' }];
		expect(especialidadesLabel(especialidades)).toBe('Electricidad');
		expect(especialidadesLabel([])).toBe('Sin especialidad');
	});

	it('muestra el mismo nombre para un profesional del padrón y para su ficha', () => {
		const profesional: AdminProfessional = {
			id: 'p1', usuarioId: 'u1', legajo: 'P-1', estado: 'ACTIVO',
			nombre: 'Ana', apellido: 'Díaz', especialidades: [],
		};
		const detalle: AdminUserDetail = {
			id: 'u1', nombre: 'Ana', apellido: 'Díaz', email: 'ana@vincula-up.local', rolNegocio: 'PROFESIONAL',
		};

		expect(nombreCompleto(profesional)).toBe('Ana Díaz');
		expect(nombreCompleto(detalle)).toBe('Ana Díaz');
	});
});

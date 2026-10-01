import { Component, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AdminAviso, AdminRequest, avisoClase, avisoError } from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { VuIcon } from '../../shared/icon/icon';

/** Barra de demanda: especialidad, solicitudes y nivel calculado. */
interface Demanda {
	nombre: string;
	solicitudes: number;
	nivel: 'Alta' | 'Media' | 'Baja';
	/** Porcentaje de la barra, proporcional a la especialidad más demandada. */
	porcentaje: number;
}

/** Etapa del recorrido de una solicitud, del pedido al impacto. */
interface Etapa {
	label: string;
	value: number;
}

/**
 * Resumen de administración: los indicadores del panel (demanda por especialidad
 * y el recorrido de las solicitudes) calculados sobre las solicitudes, el padrón
 * y los clientes reales del backend.
 */
@Component({
	selector: 'app-admin-dashboard',
	imports: [VuIcon],
	templateUrl: './admin-dashboard.html',
	styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {
	private readonly api = inject(ApiService);

	readonly loading = signal(true);
	/** Mismo aviso tipado que el resto del panel: distingue error de información. */
	readonly aviso = signal<AdminAviso>({ texto: '', tipo: 'info' });
	readonly avisoClase = avisoClase;

	private readonly solicitudes = signal<AdminRequest[]>([]);
	private readonly especialidades = signal<Record<string, string>>({});
	private readonly profesionalesActivos = signal(0);
	private readonly clientesRegistrados = signal(0);

	/** Indicadores de éxito (los mismos rótulos del prototipo). */
	readonly metricas = computed(() => {
		const solicitudes = this.solicitudes();
		const mesActual = solicitudes.filter((item) => this.esDelMesActual(item.fechaCreacion));
		const completadas = solicitudes.filter((item) => item.estado === 'COMPLETADA');
		const calificadas = solicitudes.filter((item) => item.puntaje != null);
		const promedio = calificadas.length
			? calificadas.reduce((total, item) => total + (item.puntaje ?? 0), 0) / calificadas.length
			: 0;

		return [
			{ label: 'Solicitudes este mes', value: String(mesActual.length), nota: this.porcentajeDe(mesActual.length, solicitudes.length) },
			{ label: 'Servicios completados', value: String(completadas.length), nota: this.porcentajeDe(completadas.length, solicitudes.length) },
			{ label: 'Profesionales activos', value: String(this.profesionalesActivos()), nota: 'con perfil activado' },
			{ label: 'Clientes registrados', value: String(this.clientesRegistrados()), nota: 'en la plataforma' },
			{ label: 'Tasa de concreción', value: this.tasaConcrecion(solicitudes), nota: 'solicitudes completadas' },
			{ label: 'Satisfacción promedio', value: promedio > 0 ? `${promedio.toFixed(1)} / 5` : 'Sin datos', nota: `${calificadas.length} valoraciones` },
		];
	});

	/** Especialidades con más solicitudes, para planificar la oferta académica. */
	readonly demandaPorEspecialidad = computed<ReadonlyArray<Demanda>>(() => {
		const conteo = new Map<string, number>();
		for (const solicitud of this.solicitudes()) {
			conteo.set(solicitud.especialidadId, (conteo.get(solicitud.especialidadId) ?? 0) + 1);
		}

		const nombres = this.especialidades();
		const filas = [...conteo.entries()]
			.map(([especialidadId, solicitudes]) => ({
				nombre: nombres[especialidadId] ?? 'Especialidad sin nombre',
				solicitudes,
			}))
			.sort((a, b) => b.solicitudes - a.solicitudes)
			.slice(0, 5);

		const maximo = filas[0]?.solicitudes ?? 0;
		return filas.map((fila) => ({
			...fila,
			nivel: this.nivelDemanda(fila.solicitudes, maximo),
			porcentaje: maximo > 0 ? Math.round((fila.solicitudes / maximo) * 100) : 0,
		}));
	});

	/** Recorrido de la solicitud: recibida, aceptada, completada y valorada. */
	readonly etapas = computed<ReadonlyArray<Etapa>>(() => {
		const solicitudes = this.solicitudes();
		const completadas = solicitudes.filter((item) => item.estado === 'COMPLETADA').length;
		// Todo lo que avanzó del estado pendiente: aceptada, completada o cancelada.
		const atendidas = solicitudes.filter((item) => item.estado !== 'PENDIENTE' && item.estado !== 'RECHAZADA').length;
		return [
			{ label: 'Solicitudes recibidas', value: solicitudes.length },
			{ label: 'Aceptadas por profesionales', value: atendidas },
			{ label: 'Servicios completados', value: completadas },
			{ label: 'Valoraciones recibidas', value: solicitudes.filter((item) => item.puntaje != null).length },
		];
	});


	constructor() {
		this.cargar();
	}

	private cargar(): void {
		this.loading.set(true);
		forkJoin({
			solicitudes: this.api.getAdminRequests().pipe(
				map((items) => items ?? []),
				catchError((error) => {
					this.aviso.set(avisoError(this.api.describeError(error, 'No se pudieron cargar las solicitudes.')));
					return of([] as AdminRequest[]);
				}),
			),
			especialidades: this.api.getSpecialtiesMap().pipe(catchError(() => of({} as Record<string, string>))),
			profesionales: this.api.getProfessionals(undefined, true).pipe(
				map((items) => (items ?? []).filter((item) => (item.estado ?? '').toUpperCase() === 'ACTIVO').length),
				catchError(() => of(0)),
			),
			clientes: this.api.getUsers('CLIENTE').pipe(
				map((items) => (items ?? []).length),
				catchError(() => of(0)),
			),
		}).subscribe(({ solicitudes, especialidades, profesionales, clientes }) => {
			this.solicitudes.set(solicitudes);
			this.especialidades.set(especialidades);
			this.profesionalesActivos.set(profesionales);
			this.clientesRegistrados.set(clientes);
			this.loading.set(false);
		});
	}

	/** Nivel de demanda relativo a la especialidad más solicitada. */
	private nivelDemanda(solicitudes: number, maximo: number): Demanda['nivel'] {
		if (maximo <= 0) {
			return 'Baja';
		}
		const ratio = solicitudes / maximo;
		if (ratio >= 0.75) {
			return 'Alta';
		}
		return ratio >= 0.35 ? 'Media' : 'Baja';
	}

	private tasaConcrecion(solicitudes: ReadonlyArray<AdminRequest>): string {
		if (solicitudes.length === 0) {
			return 'Sin datos';
		}
		const completadas = solicitudes.filter((item) => item.estado === 'COMPLETADA').length;
		return `${Math.round((completadas / solicitudes.length) * 100)}%`;
	}

	/** Porcentaje del total que representa el valor (nota del indicador). */
	private porcentajeDe(valor: number, total: number): string {
		return total <= 0 ? '0% del total' : `${Math.round((valor / total) * 100)}% del total`;
	}

	private esDelMesActual(fecha: string | undefined): boolean {
		if (!fecha) {
			return false;
		}
		const date = new Date(fecha);
		if (Number.isNaN(date.getTime())) {
			return false;
		}
		const hoy = new Date();
		return date.getFullYear() === hoy.getFullYear() && date.getMonth() === hoy.getMonth();
	}
}
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import {
	AdminAviso,
	AdminConfirmacion,
	AdminRequest,
	AdminUser,
	avisoClase,
	avisoError,
	avisoExito,
	coincideBusqueda,
	estadoClase,
	estadoLabel,
	inicialesDe,
	nombreCompleto,
} from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { VuAvatar } from '../../shared/avatar/avatar';
import { VuConfirm } from '../../shared/confirm/confirm';
import { VuIcon } from '../../shared/icon/icon';

/**
 * Clientes registrados: actividad (solicitudes realizadas), estado de la cuenta y
 * suspensión/reactivación. Los clientes se registran solos desde "Crear cuenta", así
 * que el panel sólo gestiona el acceso.
 */
@Component({
	selector: 'app-admin-clients',
	imports: [FormsModule, RouterLink, VuAvatar, VuConfirm, VuIcon],
	templateUrl: './admin-clients.html',
	styleUrl: './admin-clients.css',
})
export class AdminClients {
	private readonly api = inject(ApiService);

	readonly clients = signal<AdminUser[]>([]);
	readonly loading = signal(true);

	/** Aviso de la última acción: ahora distingue éxito de error. */
	readonly aviso = signal<AdminAviso>({ texto: '', tipo: 'info' });
	readonly avisoClase = avisoClase;

	/**
	 * Activar o desactivar una cuenta cambia lo que la persona puede hacer, así que
	 * ambas pasan por confirmación antes de ejecutarse.
	 */
	readonly confirmacion = signal<AdminConfirmacion | null>(null);

	confirmarAccion(): void {
		const pendiente = this.confirmacion();
		if (!pendiente) {
			return;
		}
		this.confirmacion.set(null);
		pendiente.ejecutar();
	}

	cancelarAccion(): void {
		this.confirmacion.set(null);
	}
	readonly busyId = signal<string | null>(null);

	/** Solicitudes por cliente, para la columna de actividad. */
	private readonly solicitudesPorCliente = signal<ReadonlyMap<string, number>>(new Map());

	// ── Buscador ────────────────────────────────────────────────────────

	readonly busqueda = signal('');

	/** Texto de la búsqueda ya recortado. */
	readonly consulta = computed(() => this.busqueda().trim());

	/** Nombre, email y teléfono: los textos por los que se puede buscar. */
	private textoBuscable(client: AdminUser): Array<string | undefined> {
		return [nombreCompleto(client), client.email, client.telefono];
	}

	/**
	 * Clientes que se muestran, con su actividad y ordenados de mayor a menor uso.
	 * Filtra por la búsqueda (nombre, email o teléfono, sin distinguir mayúsculas ni
	 * acentos). El filtrado es local: la pantalla ya carga la lista completa, y con
	 * el campo vacío devuelve todo.
	 */
	readonly clientesOrdenados = computed(() => {
		const conteo = this.solicitudesPorCliente();
		const q = this.consulta();
		return [...this.clients()]
			.map((client) => ({ client, solicitudes: conteo.get(client.id) ?? 0 }))
			.filter((item) => coincideBusqueda(q, ...this.textoBuscable(item.client)))
			.sort((a, b) => b.solicitudes - a.solicitudes);
	});

	hayBusqueda(): boolean {
		return this.consulta().length > 0;
	}

	limpiarBusqueda(): void {
		this.busqueda.set('');
	}

	readonly activos = computed(() => this.clients().filter((client) => this.estaActivo(client)).length);

	constructor() {
		this.cargar();
	}

	private cargar(): void {
		this.loading.set(true);
		forkJoin({
			clientes: this.api.getUsers('CLIENTE').pipe(
				map((items) => (items ?? []) as AdminUser[]),
				catchError((error) => {
					this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo cargar la lista de clientes.')));
					return of([] as AdminUser[]);
				}),
			),
			solicitudes: this.api.getAdminRequests().pipe(
				map((items) => this.contarPorCliente(items ?? [])),
				catchError(() => of(new Map<string, number>())),
			),
		}).subscribe(({ clientes, solicitudes }) => {
			this.clients.set(clientes);
			this.solicitudesPorCliente.set(solicitudes);
			this.loading.set(false);
		});
	}

	private contarPorCliente(solicitudes: ReadonlyArray<AdminRequest>): Map<string, number> {
		const conteo = new Map<string, number>();
		for (const solicitud of solicitudes) {
			conteo.set(solicitud.clienteId, (conteo.get(solicitud.clienteId) ?? 0) + 1);
		}
		return conteo;
	}

	// ── Acceso ─────────────────────────────────────────────────────────

	/** Desactivar o reactivar la cuenta: siempre con confirmación previa. */
	toggleAccess(client: AdminUser): void {
		const suspendiendo = this.estaActivo(client);
		this.confirmacion.set({
			titulo: suspendiendo ? 'Desactivar la cuenta' : 'Reactivar la cuenta',
			mensaje: suspendiendo
				? `¿Desactivás la cuenta de ${this.nombre(client)}?`
				: `¿Reactivás la cuenta de ${this.nombre(client)}?`,
			detalle: suspendiendo
				? 'No podrá entrar al panel ni hacer pedidos hasta que se reactive. Sus solicitudes y calificaciones se conservan.'
				: 'Vuelve a poder entrar al panel y hacer pedidos.',
			confirmar: suspendiendo ? 'Desactivar' : 'Reactivar',
			peligro: suspendiendo,
			icono: suspendiendo ? 'pause' : 'play',
			ejecutar: () => this.ejecutarCambioDeAcceso(client, suspendiendo),
		});
	}

	private ejecutarCambioDeAcceso(client: AdminUser, suspendiendo: boolean): void {
		this.busyId.set(client.id);
		const peticion = suspendiendo ? this.api.suspendUser(client.id) : this.api.reactivateUser(client.id);

		peticion.pipe(
			map(() => true),
			catchError((error) => {
				this.busyId.set(null);
				this.aviso.set(
					avisoError(this.api.describeError(error, suspendiendo ? 'No se pudo desactivar la cuenta.' : 'No se pudo reactivar la cuenta.')),
				);
				return of(false);
			}),
		).subscribe((ok) => {
			this.busyId.set(null);
			if (!ok) {
				return;
			}
			// Sólo se actualiza el estado en pantalla: recargar todo pisaba el cambio
			// con la foto vieja del backend.
			const estado = suspendiendo ? 'SUSPENDIDO' : 'ACTIVO';
			this.clients.update((items) => items.map((item) => (item.id === client.id ? { ...item, estado } : item)));
			this.aviso.set(
				avisoExito(
					suspendiendo
						? `${this.nombre(client)} quedó desactivado y no puede entrar al panel.`
						: `La cuenta de ${this.nombre(client)} quedó reactivada.`,
				),
			);
		});
	}

	// ── Presentación ──────────────────────────────────────────────────────

	readonly estadoLabel = estadoLabel;
	readonly estadoClase = estadoClase;
	readonly nombreCompleto = nombreCompleto;

	nombre(client: AdminUser): string {
		return nombreCompleto(client);
	}

	iniciales(client: AdminUser): string {
		return inicialesDe(this.nombre(client));
	}

	estaActivo(client: AdminUser): boolean {
		return (client.estado ?? 'ACTIVO').toUpperCase() === 'ACTIVO';
	}
}

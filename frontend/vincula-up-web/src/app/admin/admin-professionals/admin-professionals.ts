import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import {
	AdminAviso,
	AdminConfirmacion,
	AdminProfessional,
	AdminSpecialty,
	AdminUser,
	alternarId,
	avisoClase,
	avisoError,
	avisoExito,
	coincideBusqueda,
	especialidadesLabel,
	estadoClase,
	estadoLabel,
	inicialesDe,
	nombreCompleto,
} from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { VuAvatar } from '../../shared/avatar/avatar';
import { VuConfirm } from '../../shared/confirm/confirm';
import { VuIcon } from '../../shared/icon/icon';

/** Modo del modal: sólo consultar, o consultar y editar a la vez. */
type ModalModo = 'consulta' | 'edicion';

/**
 * Padrón de profesionales, igual al prototipo: alta de preregistros, cards con
 * foto (o iniciales), especialidades y estado, y un detalle que se abre tanto
 * para consultar como para actualizar.
 */
@Component({
	selector: 'app-admin-professionals',
	imports: [FormsModule, RouterLink, VuAvatar, VuConfirm, VuIcon],
	templateUrl: './admin-professionals.html',
	styleUrl: './admin-professionals.css',
})
export class AdminProfessionals {
	private readonly api = inject(ApiService);

	readonly professionals = signal<AdminProfessional[]>([]);
	readonly specialties = signal<AdminSpecialty[]>([]);
	readonly loading = signal(true);

	/** Aviso de la última acción: ahora distingue éxito de error. */
	readonly aviso = signal<AdminAviso>({ texto: '', tipo: 'info' });
	readonly avisoClase = avisoClase;

	/**
	 * Acción pendiente de confirmación. Ninguna modificación o baja se aplica sin
	 * pasar por el diálogo: se declara la pregunta y la consecuencia, y recién ahí
	 * se ejecuta.
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

	/** Cuentas de los profesionales: traen email, teléfono y la foto real. */
	private readonly cuentas = signal<ReadonlyMap<string, AdminUser>>(new Map());

	// ── Buscador ────────────────────────────────────────────────────────

	readonly busqueda = signal('');

	/** Texto de la búsqueda ya recortado. */
	readonly consulta = computed(() => this.busqueda().trim());

	/**
	 * Padrón que se muestra. Busca por nombre, legajo, email, teléfono y
	 * especialidades, sin distinguir mayúsculas ni acentos. El filtrado es local:
	 * la pantalla ya carga el padrón completo.
	 */
	readonly profesionalesFiltrados = computed(() => {
		const q = this.consulta();
		if (!q) {
			return this.professionals();
		}
		return this.professionals().filter((profesional) =>
			coincideBusqueda(
				q,
				this.nombre(profesional),
				profesional.legajo,
				this.email(profesional),
				this.telefono(profesional),
				especialidadesLabel(profesional.especialidades),
			),
		);
	});

	hayBusqueda(): boolean {
		return this.consulta().length > 0;
	}

	limpiarBusqueda(): void {
		this.busqueda.set('');
	}

	// ── Preregistros ──────────────────────────────────────────────────────

	readonly formOpen = signal(false);
	readonly submitting = signal(false);
	readonly form = {
		nombre: '',
		apellido: '',
		email: '',
		telefono: '',
		legajo: '',
		especialidadIds: [] as string[],
	};

	toggleForm(): void {
		this.formOpen.update((open) => !open);
		this.aviso.set({ texto: '', tipo: 'info' });
	}

	toggleSpecialty(id: string): void {
		this.form.especialidadIds = alternarId(this.form.especialidadIds, id);
	}

	/** Da de alta al profesional invitado: queda a la espera de que active su perfil. */
	createProfessionalInvite(): void {
		if (!this.form.nombre.trim() || !this.form.apellido.trim() || !this.form.email.trim()) {
			this.aviso.set(avisoError('Completá nombre, apellido y email del profesional.'));
			return;
		}
		if (!this.form.legajo.trim()) {
			this.aviso.set(avisoError('Completá el legajo del profesional.'));
			return;
		}
		if (this.form.especialidadIds.length === 0) {
			this.aviso.set(avisoError('Elegí al menos una especialidad.'));
			return;
		}

		this.submitting.set(true);
		this.api.createProfessionalInvite({
			nombre: this.form.nombre.trim(),
			apellido: this.form.apellido.trim(),
			email: this.form.email.trim(),
			telefono: this.form.telefono.trim(),
			legajo: this.form.legajo.trim(),
			especialidadIds: this.form.especialidadIds,
		}).pipe(
			catchError((error) => {
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo dar de alta el profesional.')));
				return of(null);
			}),
		).subscribe((result) => {
			this.submitting.set(false);
			if (result) {
				this.aviso.set(
					avisoExito(
						`Preregistro de ${this.form.email.trim()} guardado: el profesional se registra en Keycloak con ese email y activa su perfil.`,
					),
				);
				this.form.nombre = '';
				this.form.apellido = '';
				this.form.email = '';
				this.form.telefono = '';
				this.form.legajo = '';
				this.form.especialidadIds = [];
				this.formOpen.set(false);
				this.cargar();
			}
		});
	}

	// ── Carga ─────────────────────────────────────────────────────────────

	private cargar(): void {
		this.loading.set(true);
		forkJoin({
			profesionales: this.api.getProfessionals(undefined, true).pipe(
				map((items) => (items ?? []) as unknown as AdminProfessional[]),
				catchError((error) => {
					this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo cargar la lista de profesionales.')));
					return of([] as AdminProfessional[]);
				}),
			),
			especialidades: this.api.getSpecialties().pipe(
				map((items) => (items ?? []) as AdminSpecialty[]),
				catchError((error) => {
					this.aviso.set(avisoError(this.api.describeError(error, 'No se pudieron cargar las especialidades disponibles.')));
					return of([] as AdminSpecialty[]);
				}),
			),
			// El email y la foto reales viven en la cuenta (ms-usuarios), no en el padrón.
			cuentas: this.api.getUsers('PROFESIONAL').pipe(
				map((items) => {
					const porId = new Map<string, AdminUser>();
					for (const usuario of (items ?? []) as AdminUser[]) {
						porId.set(usuario.id, usuario);
					}
					return porId as ReadonlyMap<string, AdminUser>;
				}),
				catchError(() => of(new Map<string, AdminUser>() as ReadonlyMap<string, AdminUser>)),
			),
		}).subscribe(({ profesionales, especialidades, cuentas }) => {
			this.professionals.set(profesionales);
			this.specialties.set(especialidades);
			this.cuentas.set(cuentas);
			this.loading.set(false);
		});
	}

	// ── Detalle (consultar / actualizar) ─────────────────────────────────

	readonly modal = signal<{ profesional: AdminProfessional; modo: ModalModo } | null>(null);
	readonly savingEdit = signal(false);
	readonly editForm = { legajo: '', especialidadIds: [] as string[] };

	/** El prototipo abre el mismo detalle con "Consultar" y con "Actualizar". */
	abrirDetalle(profesional: AdminProfessional, modo: ModalModo): void {
		this.aviso.set({ texto: '', tipo: 'info' });
		this.editForm.legajo = profesional.legajo ?? '';
		this.editForm.especialidadIds = profesional.especialidades?.map((item) => item.id) ?? [];
		this.modal.set({ profesional, modo });
	}

	cerrarDetalle(): void {
		this.modal.set(null);
	}

	toggleEditSpecialty(id: string): void {
		this.editForm.especialidadIds = alternarId(this.editForm.especialidadIds, id);
	}

	/** Guarda una edición del padrón. Pide confirmación y resume qué cambia. */
	guardarCambios(): void {
		const abierto = this.modal();
		if (!abierto) {
			return;
		}
		const legajo = this.editForm.legajo.trim();
		if (!legajo) {
			this.aviso.set(avisoError('El legajo no puede quedar vacío.'));
			return;
		}
		if (this.editForm.especialidadIds.length === 0) {
			this.aviso.set(avisoError('Elegí al menos una especialidad.'));
			return;
		}

		this.confirmacion.set({
			titulo: 'Guardar los cambios',
			mensaje: `¿Actualizás los datos de ${this.nombre(abierto.profesional)}?`,
			detalle: this.resumenCambios(abierto.profesional, legajo),
			confirmar: 'Guardar cambios',
			icono: 'pencil',
			ejecutar: () => this.ejecutarGuardado(abierto.profesional, legajo),
		});
	}

	/** Qué cambia de verdad: si no hay diferencias, lo dice y no se guardan. */
	private resumenCambios(profesional: AdminProfessional, legajo: string): string {
		const actuales = (profesional.especialidades ?? []).map((item) => item.nombre);
		const nuevas = this.editForm.especialidadIds
			.map((id) => this.specialties().find((item) => item.id === id)?.nombre)
			.filter((nombre): nombre is string => !!nombre);
		const cambios: string[] = [];
		if ((profesional.legajo ?? '') !== legajo) {
			cambios.push(`Legajo: de "${profesional.legajo || 'sin legajo'}" a "${legajo}".`);
		}
		const agrega = nuevas.filter((nombre) => !actuales.includes(nombre));
		const quita = actuales.filter((nombre) => !nuevas.includes(nombre));
		if (agrega.length) {
			cambios.push(`Agrega: ${agrega.join(', ')}.`);
		}
		if (quita.length) {
			cambios.push(`Quita: ${quita.join(', ')}.`);
		}
		return cambios.length
			? cambios.join(' ')
			: 'No hay cambios: las especialidades quedan igual que están.';
	}

	private ejecutarGuardado(profesional: AdminProfessional, legajo: string): void {
		// ms-profesionales sólo administra legajo y especialidades: los datos
		// personales viven en ms-usuarios y no se editan desde este panel.
		this.savingEdit.set(true);
		this.api.updateProfessional(profesional.id, {
			usuarioId: profesional.usuarioId,
			legajo,
			especialidadIds: this.editForm.especialidadIds,
		}).pipe(
			catchError((error) => {
				this.savingEdit.set(false);
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo actualizar el profesional.')));
				return of(null);
			}),
		).subscribe((result) => {
			this.savingEdit.set(false);
			if (result) {
				this.modal.set(null);
				this.aviso.set(avisoExito(`${this.nombre(profesional)} quedó actualizado en el padrón.`));
				this.cargar();
			}
		});
	}

	// ── Estado y baja ─────────────────────────────────────────────────────

	readonly busyId = signal<string | null>(null);

	constructor() {
		this.cargar();
	}

	/** Baja lógica del padrón: se pide confirmación porque saca al profesional del directorio. */
	suspend(profesional: AdminProfessional): void {
		this.confirmacion.set({
			titulo: 'Suspender al profesional',
			mensaje: `¿Querés suspender a ${this.nombre(profesional)}?`,
			detalle:
				'Deja de aparecer en el directorio y no puede recibir solicitudes nuevas. No se borra nada: conserva su historial, y más adelante podés levantar la suspensión.',
			confirmar: 'Suspender',
			peligro: true,
			icono: 'pause',
			ejecutar: () => this.ejecutarSuspension(profesional),
		});
	}

	private ejecutarSuspension(profesional: AdminProfessional): void {
		this.busyId.set(profesional.id);
		this.api.suspendProfessional(profesional.id).pipe(
			map(() => true),
			catchError((error) => {
				this.busyId.set(null);
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo suspender al profesional.')));
				return of(false);
			}),
		).subscribe((ok) => {
			this.busyId.set(null);
			if (ok) {
				// El backend devuelve SUSPENDIDO: la suspensión no activa perfiles.
				this.actualizarEstado(profesional.id, 'SUSPENDIDO');
				this.aviso.set(
					avisoExito(`${this.nombre(profesional)} quedó suspendido y ya no recibe solicitudes.`),
				);
			}
		});
	}

	/** Levantar laSuspensión también se confirma: devuelve acceso al directorio. */
	reactivate(profesional: AdminProfessional): void {
		this.confirmacion.set({
			titulo: 'Levantar la suspensión',
			mensaje: `¿Querés volver a habilitar a ${this.nombre(profesional)}?`,
			detalle:
				'Vuelve a aparecer en el directorio. Si todavía no completó su activación, queda como preregistro hasta que la termine.',
			confirmar: 'Levantar suspensión',
			icono: 'play',
			ejecutar: () => this.ejecutarReactivacion(profesional),
		});
	}

	private ejecutarReactivacion(profesional: AdminProfessional): void {
		this.busyId.set(profesional.id);
		this.api.reactivateProfessional(profesional.id).pipe(
			map((result) => (result as { estado?: string } | null)?.estado ?? 'CARGADO'),
			catchError((error) => {
				this.busyId.set(null);
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo levantar la suspensión.')));
				return of(null);
			}),
		).subscribe((estado) => {
			this.busyId.set(null);
			if (estado) {
				// El backend devuelve CARGADO (no ACTIVO): levantar el baneo no activa perfiles.
				this.actualizarEstado(profesional.id, estado);
				this.aviso.set(avisoExito(`La suspensión de ${this.nombre(profesional)} quedó levantada.`));
				this.cargar();
			}
		});
	}

	private actualizarEstado(id: string, estado: string): void {
		this.professionals.update((items) => items.map((item) => (item.id === id ? { ...item, estado } : item)));
	}

	// ── Presentación ──────────────────────────────────────────────────────

	readonly estadoLabel = estadoLabel;
	readonly estadoClase = estadoClase;

	nombre(profesional: AdminProfessional): string {
		return nombreCompleto(this.cuenta(profesional) ?? profesional);
	}

	iniciales(profesional: AdminProfessional): string {
		return inicialesDe(this.nombre(profesional));
	}

	email(profesional: AdminProfessional): string {
		return this.cuenta(profesional)?.email ?? 'Sin email';
	}

	telefono(profesional: AdminProfessional): string {
		return this.cuenta(profesional)?.telefono ?? '';
	}

	/**
	 * Foto que se muestra: la de la cuenta (la que la persona sube y actualiza).
	 * La del padrón queda de respaldo para perfiles cargados antes de la cuenta.
	 */
	foto(profesional: AdminProfessional): string | null {
		return this.cuenta(profesional)?.fotoUrl ?? profesional.fotoUrl ?? null;
	}

	/** Todavía no creó su cuenta en Keycloak: la invitación sigue pendiente. */
	invitacionPendiente(profesional: AdminProfessional): boolean {
		const cuenta = this.cuenta(profesional);
		return cuenta ? cuenta.keycloakId == null : (profesional.estado ?? '').toUpperCase() === 'CARGADO';
	}

	estaSuspendido(profesional: AdminProfessional): boolean {
		return (profesional.estado ?? '').toUpperCase() === 'SUSPENDIDO';
	}

	/** Sólo se ofrece suspensión a los perfiles que ya pueden operar. */
	puedeSuspenderse(profesional: AdminProfessional): boolean {
		const estado = (profesional.estado ?? '').toUpperCase();
		return estado === 'ACTIVO' || estado === 'CARGADO';
	}

	private cuenta(profesional: AdminProfessional): AdminUser | undefined {
		return this.cuentas().get(profesional.usuarioId);
	}
}

import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
	AdminAviso,
	AdminConfirmacion,
	AdminSpecialty,
	avisoClase,
	avisoError,
	avisoExito,
	coincideBusqueda,
} from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { MatListModule } from '@angular/material/list';
import { VuConfirm } from '../../shared/confirm/confirm';
import { VuIcon } from '../../shared/icon/icon';
import { VuSkeletonList } from '../../shared/skeleton-list/skeleton-list';
import { AdminUnsavedChanges } from '../admin-unsaved-changes.guard';
import { OperationFeedbackService } from '../../core/services/operation-feedback.service';

/**
 * Catálogo de categorías (especialidades): alta, renombre y baja. La baja falla con
 * un mensaje del backend cuando la especialidad está asignada a un profesional.
 */
@Component({
	selector: 'app-admin-categories',
	imports: [FormsModule, RouterLink, MatListModule, VuConfirm, VuIcon, VuSkeletonList],
	templateUrl: './admin-categories.html',
	styleUrl: './admin-categories.css',
})
export class AdminCategories implements AdminUnsavedChanges {
	private readonly api = inject(ApiService);
	private readonly dataRefresh = inject(DataRefreshService);
	private readonly router = inject(Router);
	private readonly operationFeedback = inject(OperationFeedbackService);

	readonly categories = signal<AdminSpecialty[]>([]);
	readonly loading = signal(true);
	readonly busy = signal(false);
	readonly busqueda = signal('');
	readonly ordenNombre = signal<'asc' | 'desc'>('asc');
	readonly consulta = computed(() => this.busqueda().trim());
	readonly categoriasFiltradas = computed(() => {
		const query = this.consulta();
		const direccion = this.ordenNombre() === 'asc' ? 1 : -1;
		return this.categories()
			.filter((category) => coincideBusqueda(query, category.nombre))
			.sort((a, b) => direccion * a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
	});

	limpiarBusqueda(): void {
		this.busqueda.set('');
	}

	/** Aviso de la última acción: ahora distingue éxito de error. */
	readonly aviso = signal<AdminAviso>({ texto: '', tipo: 'info' });
	readonly avisoClase = avisoClase;

	/**
	 * Renombrar y eliminar pasan por el diálogo: antes el borrado usaba el
	 * `window.confirm` del navegador y el renombrado no preguntaba nada.
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
		const pendiente = this.confirmacion();
		this.confirmacion.set(null);
		pendiente?.cancelar?.();
	}

	constructor() {
		this.leerAvisoDeAlta();
		this.cargar();
		this.dataRefresh.watch(['categories'])
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.cargar());
	}

	/** Mensaje que deja la pantalla de alta al volver con `navigate(..., { state })`. */
	private leerAvisoDeAlta(): void {
		const state = this.router.getCurrentNavigation()?.extras.state;
		const mensaje = state?.['mensaje'] as string | undefined;
		if (!mensaje) return;
		this.aviso.set(avisoExito(mensaje));
	}

	readonly renamingId = signal<string | null>(null);
	renameValue = '';

	/*
	 * El alta de una categoría se hace en otra pantalla (`/admin/categorias/nueva`),
	 * así que el catálogo ya no lleva el formulario encima. Quedan el renombre y la
	 * baja, que se operan sobre cada tarjeta.
	 */

	private cargar(): void {
		this.api.getSpecialties().pipe(
			map((items) => (items ?? []) as AdminSpecialty[]),
			catchError((error) => {
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudieron cargar las categorías.')));
				return of([] as AdminSpecialty[]);
			}),
		).subscribe((items) => {
			this.categories.set(items);
			this.loading.set(false);
		});
	}

	startRename(category: AdminSpecialty): void {
		this.aviso.set({ texto: '', tipo: 'info' });
		this.renamingId.set(category.id);
		this.renameValue = category.nombre;
	}

	cancelRename(): void {
		const category = this.categories().find((item) => item.id === this.renamingId());
		if (category) {
			this.confirmacion.set({
				titulo: this.hayCambiosEnRenombre(category) ? 'Descartar el renombre' : 'Salir de la edición',
				mensaje: this.hayCambiosEnRenombre(category)
					? `¿Descartar los cambios de "${category.nombre}"?`
					: `¿Cerrar la edición de "${category.nombre}"?`,
				detalle: this.hayCambiosEnRenombre(category)
					? 'El nombre original se conservará en el catálogo.'
					: 'La categoría no tiene cambios pendientes.',
				confirmar: this.hayCambiosEnRenombre(category) ? 'Descartar cambios' : 'Cerrar edición',
				textoCancelar: 'Seguir editando',
				peligro: this.hayCambiosEnRenombre(category),
				cancelarPrimario: true,
				icono: 'pencil',
				ejecutar: () => this.renamingId.set(null),
			});
			return;
		}
		this.renamingId.set(null);
	}

	confirmarSalidaPendiente(): boolean | Promise<boolean> {
		if (this.busy()) {
			this.aviso.set(avisoError('Esperá a que termine la operación antes de cambiar de sección.'));
			return false;
		}
		const id = this.renamingId();
		const category = this.categories().find((item) => item.id === id);
		if (!category) return true;
		if (this.confirmacion()) {
			this.aviso.set(avisoError('Terminá o cancelá la acción pendiente antes de cambiar de sección.'));
			return false;
		}
		const hayCambios = this.hayCambiosEnRenombre(category);
		return new Promise((resolve) => {
			this.confirmacion.set({
				titulo: hayCambios ? '¿Salir sin guardar?' : '¿Salir de la edición?',
				mensaje: hayCambios
					? `El renombre de "${category.nombre}" tiene cambios sin guardar.`
					: `Estás editando "${category.nombre}".`,
				detalle: hayCambios
					? 'Si salís ahora, vas a perder el nuevo nombre ingresado.'
					: 'Podés volver a modificarla más adelante.',
				confirmar: hayCambios ? 'Salir sin guardar' : 'Salir de la edición',
				textoCancelar: 'Seguir editando',
				peligro: hayCambios,
				cancelarPrimario: true,
				icono: 'pencil',
				ejecutar: () => resolve(true),
				cancelar: () => resolve(false),
			});
		});
	}

	private hayCambiosEnRenombre(category: AdminSpecialty): boolean {
		return this.renameValue.trim() !== category.nombre;
	}

	/** Renombrar: primero valida, después pide confirmación con el nombre nuevo. */
	saveRename(category: AdminSpecialty): void {
		const nombre = this.renameValue.trim();
		if (!nombre) {
			this.aviso.set(avisoError('El nombre de la categoría no puede quedar vacío.'));
			return;
		}
		if (nombre === category.nombre) {
			this.cancelRename();
			return;
		}

		this.confirmacion.set({
			titulo: 'Renombrar la categoría',
			mensaje: `¿Cambiás "${category.nombre}" por "${nombre}"?`,
			detalle: 'La especialidad queda con el nombre nuevo para los profesionales que la tengan asignada.',
			confirmar: 'Renombrar',
			icono: 'pencil',
			ejecutar: () => this.ejecutarRenombrado(category, nombre),
		});
	}

	private ejecutarRenombrado(category: AdminSpecialty, nombre: string): void {
		this.busy.set(true);
		this.operationFeedback.track(
			'Guardando el nuevo nombre…',
			this.api.saveSpecialty(category.id, nombre),
			'Estamos actualizando la categoría en el catálogo.',
		).pipe(
			catchError((error) => {
				this.busy.set(false);
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo renombrar la categoría.')));
				return of(null);
			}),
		).subscribe((result) => {
			this.busy.set(false);
			if (result) {
				this.renamingId.set(null);
				this.aviso.set(avisoExito(`La categoría ahora se llama "${nombre}".`));
			}
		});
	}

	/** Borrado real del catálogo: pide confirmación y avisa que no se puede deshacer. */
	deleteCategory(category: AdminSpecialty): void {
		this.confirmacion.set({
			titulo: 'Eliminar la categoría',
			mensaje: `¿Eliminar "${category.nombre}" del catálogo?`,
			detalle:
				'Es un borrado real: la especialidad desaparece de la lista y no se puede recuperar. Si hay profesionales con esta especialidad asignada, la operación se rechaza.',
			confirmar: 'Eliminar',
			peligro: true,
			icono: 'tag',
			ejecutar: () => this.ejecutarBorrado(category),
		});
	}

	private ejecutarBorrado(category: AdminSpecialty): void {
		this.busy.set(true);
		this.operationFeedback.track(
			'Eliminando la categoría…',
			this.api.deleteSpecialty(category.id),
			'Estamos verificando y actualizando el catálogo.',
		).pipe(
			map(() => true),
			catchError((error) => {
				this.busy.set(false);
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo eliminar la categoría.')));
				return of(false);
			}),
		).subscribe((deleted) => {
			this.busy.set(false);
			if (deleted) {
				this.aviso.set(avisoExito(`"${category.nombre}" se eliminó del catálogo.`));
			}
		});
	}
}

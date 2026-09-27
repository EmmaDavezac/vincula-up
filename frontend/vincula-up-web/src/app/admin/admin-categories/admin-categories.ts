import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import {
	AdminAviso,
	AdminConfirmacion,
	AdminSpecialty,
	avisoClase,
	avisoError,
	avisoExito,
} from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { VuConfirm } from '../../shared/confirm/confirm';

/**
 * Catálogo de categorías (especialidades): alta, renombre y baja. La baja falla con
 * un mensaje del backend cuando la especialidad está asignada a un profesional.
 */
@Component({
	selector: 'app-admin-categories',
	imports: [FormsModule, RouterLink, VuConfirm],
	templateUrl: './admin-categories.html',
	styleUrl: './admin-categories.css',
})
export class AdminCategories {
	private readonly api = inject(ApiService);

	readonly categories = signal<AdminSpecialty[]>([]);
	readonly loading = signal(true);
	readonly busy = signal(false);

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
		this.confirmacion.set(null);
	}

	nuevaCategoria = '';
	readonly renamingId = signal<string | null>(null);
	renameValue = '';

	constructor() {
		this.cargar();
	}

	private cargar(): void {
		this.loading.set(true);
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

	createCategory(): void {
		const nombre = this.nuevaCategoria.trim();
		if (!nombre) {
			this.aviso.set(avisoError('Escribí el nombre de la nueva categoría.'));
			return;
		}
		if (this.categories().some((item) => item.nombre.toLowerCase() === nombre.toLowerCase())) {
			this.aviso.set(avisoError(`La categoría "${nombre}" ya existe en el catálogo.`));
			return;
		}

		this.busy.set(true);
		this.api.saveSpecialty(null, nombre).pipe(
			catchError((error) => {
				this.busy.set(false);
				this.aviso.set(avisoError(this.api.describeError(error, 'No se pudo crear la categoría.')));
				return of(null);
			}),
		).subscribe((result) => {
			this.busy.set(false);
			if (result) {
				this.nuevaCategoria = '';
				this.aviso.set(avisoExito(`"${nombre}" se agregó al catálogo.`));
				this.cargar();
			}
		});
	}

	startRename(category: AdminSpecialty): void {
		this.aviso.set({ texto: '', tipo: 'info' });
		this.renamingId.set(category.id);
		this.renameValue = category.nombre;
	}

	cancelRename(): void {
		this.renamingId.set(null);
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
		this.api.saveSpecialty(category.id, nombre).pipe(
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
				this.cargar();
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
		this.api.deleteSpecialty(category.id).pipe(
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
				this.cargar();
			}
		});
	}
}

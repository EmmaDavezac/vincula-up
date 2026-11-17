import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminSpecialty, avisoError, avisoExito } from '../../core/models/admin';
import { ApiService } from '../../core/services/api.service';
import { VuConfirm } from '../../shared/confirm/confirm';

/**
 * Alta de una categoría (especialidad), en su propia pantalla.
 *
 * <p>Antes el campo de creación estaba siempre visible arriba de las tarjetas del
 * catálogo. Con la lista cargada, ese input quedaba mezclado con el contenido y no
 * se distinguía de un filtro. Acá es una pantalla aparte, con su "Volver" al
 * catálogo, y la lista queda para renombrar y eliminar.
 */
@Component({
	selector: 'app-admin-category-new',
	imports: [FormsModule, RouterLink, VuConfirm],
	templateUrl: './admin-category-new.html',
	styleUrl: './admin-category-new.css',
})
export class AdminCategoryNew {
	private readonly api = inject(ApiService);
	private readonly router = inject(Router);

	readonly categorias = signal<AdminSpecialty[]>([]);
	readonly loading = signal(true);
	readonly busy = signal(false);
	readonly error = signal('');
	readonly confirmandoSalida = signal(false);
	private resolverSalida?: (salir: boolean) => void;
	private guardado = false;

	nombre = '';

	constructor() {
		this.cargar();
	}

	/**
	 * Se cargan las categorías existentes para poder avisar el duplicado antes de
	 * mandar el alta. El backend igual lo rechaza; esto solo evita el viaje de ida
	 * y vuelta para un nombre que ya está en pantalla.
	 */
	private cargar(): void {
		this.loading.set(true);
		this.api.getSpecialties().pipe(
			map((items) => (items ?? []) as AdminSpecialty[]),
			catchError((error) => {
				this.error.set(this.api.describeError(error, 'No se pudieron cargar las categorías.'));
				return of([] as AdminSpecialty[]);
			}),
		).subscribe((items) => {
			this.categorias.set(items);
			this.loading.set(false);
		});
	}

	crear(): void {
		if (this.busy()) return;
		const nombre = this.nombre.trim();
		if (!nombre) {
			this.error.set('Escribí el nombre de la nueva categoría.');
			return;
		}
		if (this.categorias().some((item) => item.nombre.toLowerCase() === nombre.toLowerCase())) {
			this.error.set(`La categoría "${nombre}" ya existe en el catálogo.`);
			return;
		}
		this.error.set('');

		this.busy.set(true);
		this.api.saveSpecialty(null, nombre).pipe(
			catchError((err) => {
				this.busy.set(false);
				this.error.set(this.api.describeError(err, 'No se pudo crear la categoría.'));
				return of(null);
			}),
		).subscribe((resultado) => {
			this.busy.set(false);
			if (!resultado) return;
			this.guardado = true;
			this.router.navigate(['/admin/categorias'], {
				state: { mensaje: avisoExito(`"${nombre}" se agregó al catálogo.`).texto, exito: true },
			});
		});
	}

	confirmarSalidaPendiente(): boolean | Promise<boolean> {
		if (this.guardado || !this.nombre.trim()) return true;
		if (this.busy()) {
			this.error.set('Esperá a que termine el guardado antes de cambiar de sección.');
			return false;
		}
		return new Promise((resolve) => {
			this.resolverSalida = resolve;
			this.confirmandoSalida.set(true);
		});
	}

	resolverConfirmacionSalida(salir: boolean): void {
		const resolver = this.resolverSalida;
		this.resolverSalida = undefined;
		this.confirmandoSalida.set(false);
		resolver?.(salir);
	}
}
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Forma del placeholder. Cada variante imita el layout de la lista que reemplaza:
 * `card` para tarjetas con cabecera, `row` para filas de tabla, `grid` para chips.
 */
export type VuSkeletonVariant = 'card' | 'row' | 'grid';

/**
 * Placeholder genérico de listado mientras carga.
 *
 * <p>No adivina el contenido (las fotos son privadas y los nombres llegan del
 * backend): sólo sugiere la forma de lo que viene, para que la pantalla no salte
 * de "Cargando…" a lista completa. La clase `.vu-skeleton` (fondo, pulso y
 * tema oscuro) vive en `styles.css`.
 *
 * <p>La cantidad de bloques es fija y conservadora a propósito: es una
 * sugerencia de layout, no una predicción del resultado.
 */
@Component({
	selector: 'vu-skeleton-list',
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './skeleton-list.css',
	template: `
		<div class="vu-skeleton-list" [attr.data-variant]="variant()" aria-busy="true" role="status">
			<span class="vu-sr-only">Cargando…</span>
			@for (item of items(); track item) {
				@if (variant() === 'card') {
					<div class="vu-skeleton-list__card" aria-hidden="true">
						<div class="vu-skeleton-list__head">
							<span class="vu-skeleton vu-skeleton-list__avatar"></span>
							<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--name"></span>
							<span class="vu-skeleton vu-skeleton-list__chip"></span>
						</div>
						<span class="vu-skeleton vu-skeleton-list__line"></span>
						<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
					</div>
				} @else if (variant() === 'row') {
					<div class="vu-skeleton-list__row" aria-hidden="true">
						<span class="vu-skeleton vu-skeleton-list__avatar"></span>
						<span class="vu-skeleton-list__row-text">
							<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--name"></span>
							<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
						</span>
						<span class="vu-skeleton vu-skeleton-list__chip"></span>
					</div>
				} @else {
					<div class="vu-skeleton-list__tile" aria-hidden="true">
						<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--name"></span>
						<span class="vu-skeleton vu-skeleton-list__chip"></span>
					</div>
				}
			}
		</div>
	`,
})
export class VuSkeletonList {
	/** Variante según la lista que tapa: tarjetas, filas de tabla o grilla. */
	readonly variant = input<VuSkeletonVariant>('card');

	/** Bloques fantasma. Fijo y chico: sugiere el layout sin prometer el resultado. */
	readonly count = input(3);

	readonly items = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
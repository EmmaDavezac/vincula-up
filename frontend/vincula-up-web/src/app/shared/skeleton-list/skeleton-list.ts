import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Cada variante imita el layout concreto del listado que reemplaza.
 */
export type VuSkeletonVariant =
	| 'admin-professional'
	| 'admin-client'
	| 'admin-category'
	| 'request-client'
	| 'request-professional';

export interface RequestSkeletonShape {
	hasDescription: boolean;
	hasAddress: boolean;
	hasMap: boolean;
	hasClosureReason: boolean;
	actionCount: number;
	rating: 'none' | 'waiting' | 'form' | 'submitted';
	hasRatingComment: boolean;
}

/**
 * Placeholder de listado mientras carga.
 *
 * <p>No adivina el contenido (las fotos son privadas y los nombres llegan del
 * backend): reproduce la estructura visual del tipo de ítem. La clase
 * `.vu-skeleton` (fondo, pulso y tema oscuro) vive en `styles.css`.
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
				@if (variant() === 'admin-professional') {
					<div class="vu-skeleton-list__admin-row vu-skeleton-list__admin-professional" aria-hidden="true">
						<div class="vu-skeleton-list__person">
							<span class="vu-skeleton vu-skeleton-list__avatar"></span>
							<span class="vu-skeleton-list__row-text">
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--name"></span>
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
							</span>
						</div>
						<div class="vu-skeleton-list__field vu-skeleton-list__specialties">
							<span class="vu-skeleton vu-skeleton-list__label"></span>
							<span class="vu-skeleton-list__chips">
								<span class="vu-skeleton vu-skeleton-list__chip"></span>
								<span class="vu-skeleton vu-skeleton-list__chip vu-skeleton-list__chip--short"></span>
							</span>
						</div>
						<div class="vu-skeleton-list__field">
							<span class="vu-skeleton vu-skeleton-list__label"></span>
							<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
						</div>
						<div class="vu-skeleton-list__field">
							<span class="vu-skeleton vu-skeleton-list__label"></span>
							<span class="vu-skeleton vu-skeleton-list__chip"></span>
						</div>
						<span class="vu-skeleton-list__actions">
							<span class="vu-skeleton vu-skeleton-list__button"></span>
							<span class="vu-skeleton vu-skeleton-list__button"></span>
						</span>
					</div>
				} @else if (variant() === 'admin-client') {
					<div class="vu-skeleton-list__admin-row vu-skeleton-list__admin-client" aria-hidden="true">
						<div class="vu-skeleton-list__person">
							<span class="vu-skeleton vu-skeleton-list__avatar"></span>
							<span class="vu-skeleton-list__row-text">
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--name"></span>
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
							</span>
						</div>
						<div class="vu-skeleton-list__field">
							<span class="vu-skeleton vu-skeleton-list__label"></span>
							<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
						</div>
						<div class="vu-skeleton-list__field">
							<span class="vu-skeleton vu-skeleton-list__label"></span>
							<span class="vu-skeleton vu-skeleton-list__chip"></span>
						</div>
						<span class="vu-skeleton-list__actions">
							<span class="vu-skeleton vu-skeleton-list__button"></span>
						</span>
					</div>
				} @else if (variant() === 'admin-category') {
					<div class="vu-skeleton-list__admin-row vu-skeleton-list__admin-category" aria-hidden="true">
						<div class="vu-skeleton-list__field">
							<span class="vu-skeleton vu-skeleton-list__label"></span>
							<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--name"></span>
						</div>
						<span class="vu-skeleton-list__actions">
							<span class="vu-skeleton vu-skeleton-list__button"></span>
							<span class="vu-skeleton vu-skeleton-list__button"></span>
						</span>
					</div>
				} @else {
					<div class="vu-skeleton-list__request" aria-hidden="true">
						<div class="vu-skeleton-list__request-head">
							<span class="vu-skeleton vu-skeleton-list__avatar"></span>
							<span class="vu-skeleton-list__row-text">
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--name"></span>
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
							</span>
							<span class="vu-skeleton vu-skeleton-list__chip"></span>
						</div>
						<div class="vu-skeleton-list__request-meta">
							<span class="vu-skeleton vu-skeleton-list__clock"></span>
							<span class="vu-skeleton vu-skeleton-list__line"></span>
						</div>
						@if (requestShape(item).hasDescription) {
							<div class="vu-skeleton-list__request-problem">
								<span class="vu-skeleton vu-skeleton-list__label"></span>
								<span class="vu-skeleton vu-skeleton-list__line"></span>
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--medium"></span>
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
							</div>
						}
						@if (requestShape(item).hasAddress) {
							<div class="vu-skeleton-list__request-address">
								<span class="vu-skeleton-list__pin"></span>
								<span class="vu-skeleton-list__row-text">
									<span class="vu-skeleton vu-skeleton-list__line"></span>
									<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
								</span>
							</div>
						}
						@if (requestShape(item).hasMap) {
							<span class="vu-skeleton vu-skeleton-list__request-map"></span>
						}
						@if (requestShape(item).hasClosureReason) {
							<div class="vu-skeleton-list__request-reason">
								<span class="vu-skeleton vu-skeleton-list__line"></span>
								<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--short"></span>
							</div>
						}
						@if (requestShape(item).actionCount > 0) {
							<div class="vu-skeleton-list__request-actions" [attr.data-action-count]="requestShape(item).actionCount">
								@for (action of actionPlaceholders(requestShape(item).actionCount); track action) {
									<span class="vu-skeleton vu-skeleton-list__button"></span>
								}
							</div>
						}
						@if (requestShape(item).rating !== 'none') {
							<div class="vu-skeleton-list__request-rating">
								@if (requestShape(item).rating === 'form') {
									<span class="vu-skeleton vu-skeleton-list__label"></span>
									<span class="vu-skeleton-list__rating-stars">
										@for (star of actionPlaceholders(5); track star) {
											<span class="vu-skeleton vu-skeleton-list__rating-star"></span>
										}
									</span>
									<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--medium"></span>
								} @else {
									<span class="vu-skeleton vu-skeleton-list__line vu-skeleton-list__line--medium"></span>
								}
								@if (requestShape(item).hasRatingComment) {
									<span class="vu-skeleton vu-skeleton-list__line"></span>
								}
								@if (requestShape(item).rating === 'form') {
									<span class="vu-skeleton vu-skeleton-list__request-rating-input"></span>
									<span class="vu-skeleton vu-skeleton-list__button"></span>
								}
							</div>
						}
					</div>
				}
			}
		</div>
	`,
})
export class VuSkeletonList {
	readonly variant = input.required<VuSkeletonVariant>();
	readonly requestShapes = input<readonly RequestSkeletonShape[] | null>(null);

	/** Bloques fantasma. Fijo y chico: sugiere el layout sin prometer el resultado. */
	readonly count = input(3);

	readonly items = computed(() => {
		const shapes = this.requestShapes();
		return Array.from({ length: shapes ? shapes.length : this.count() }, (_, index) => index);
	});

	requestShape(index: number): RequestSkeletonShape {
		const supplied = this.requestShapes()?.[index];
		if (supplied) return supplied;
		return {
			hasDescription: true,
			hasAddress: true,
			hasMap: this.variant() === 'request-professional',
			hasClosureReason: false,
			actionCount: this.variant() === 'request-professional' ? 2 : 1,
			rating: 'none',
			hasRatingComment: false,
		};
	}

	actionPlaceholders(count: number): number[] {
		return Array.from({ length: count }, (_, index) => index);
	}
}
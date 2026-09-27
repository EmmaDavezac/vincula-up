import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { inicialesDe } from '../../core/utils/avatar';
import { fotoUtil } from '../../core/utils/photo';

/** Tamaños del avatar, del más chico (navbar) al más grande (fichas). */
export type VuAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * Avatar único de la aplicación: muestra la foto cuando existe y, si no (o si la
 * imagen falla al cargar), cae a las iniciales con el mismo estilo del prototipo.
 * Todas las pantallas lo usan para que las fotos y los avatares se vean iguales.
 */
@Component({
	selector: 'vu-avatar',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (fotoVisible(); as url) {
			<img [src]="url" [alt]="nombre()" (error)="marcarFotoFallida()" />
		} @else {
			<span class="vu-avatar__initials" aria-hidden="true">{{ iniciales() }}</span>
		}
	`,
	// El círculo, los tamaños y los colores viven en styles.css (.vu-avatar):
	// así todos los avatares de la app se ven iguales sin importar quién los usa.
	styles: [
		`
			.vu-avatar__initials {
				line-height: 1;
			}

			img {
				display: block;
				height: 100%;
				object-fit: cover;
				width: 100%;
			}
		`,
	],
	host: {
		// La clase base vive en styles.css: sin ella el avatar no toma el círculo,
		// los colores del prototipo ni el tamaño de la variante.
		'class': 'vu-avatar',
		'[class.vu-avatar--xs]': "size() === 'xs'",
		'[class.vu-avatar--sm]': "size() === 'sm'",
		'[class.vu-avatar--md]': "size() === 'md'",
		'[class.vu-avatar--lg]': "size() === 'lg'",
		'[class.vu-avatar--xl]': "size() === 'xl'",
		'[class.vu-avatar--xxl]': "size() === 'xxl'",
	},
})
export class VuAvatar {
	readonly nombre = input<string | null | undefined>('');
	readonly foto = input<string | null | undefined>(null);
	readonly size = input<VuAvatarSize>('md');

	/** Una foto que no carga (URL vencida, hotlink bloqueado) no debe dejar el ícono roto. */
	private readonly fotoFallida = signal(false);

	readonly iniciales = computed(() => inicialesDe(this.nombre()));

	/** URL utilizable: la del input mientras la imagen no haya fallado. */
	readonly fotoVisible = computed(() => (this.fotoFallida() ? null : fotoUtil(this.foto())));

	constructor() {
		// Si la persona sube otra foto, el avatar vuelve a intentar mostrarla.
		effect(() => {
			this.foto();
			this.fotoFallida.set(false);
		});
	}

	marcarFotoFallida(): void {
		this.fotoFallida.set(true);
	}
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { inicialesDe } from '../../core/utils/avatar';
import { fotoUtil } from '../../core/utils/photo';
import { FotoService } from '../../core/services/foto.service';

/** Tamaños del avatar, del más chico (navbar) al más grande (fichas). */
export type VuAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * Avatar único de la aplicación: muestra la foto cuando existe y, si no (o si la
 * imagen falla al cargar), cae a las iniciales con el mismo estilo del prototipo.
 * Todas las pantallas lo usan para que las fotos y los avatares se vean iguales.
 *
 * <p><b>De dónde sale la imagen.</b> Las fotos de perfil son privadas: el backend
 * las entrega en `/api/usuarios/{id}/foto`, que exige sesión y controla la
 * visibilidad por rol. Por eso el avatar no recibe una URL sino el
 * {@link usuarioId} de la persona y el dato de si tiene foto, y es el
 * {@link FotoService} quien pide el binario. La única excepción es
 * {@link foto}: ahí se pasa una imagen ya disponible en el navegador (la
 * previsualización local de "Mi cuenta" y "Activar perfil"), que tiene prioridad.
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
	private readonly fotos = inject(FotoService);

	readonly nombre = input<string | null | undefined>('');
	readonly foto = input<string | null | undefined>(null);
	readonly size = input<VuAvatarSize>('md');
	/** Id del usuario dueño de la foto: el que usa para pedirla al backend. */
	readonly usuarioId = input<string | null | undefined>(null);
	/** Si esa persona tiene foto guardada. Evita pedirla cuando no la hay. */
	readonly tieneFoto = input<boolean>(false);

	/** Una foto que no carga (URL vencida, hotlink bloqueado) no debe dejar el ícono roto. */
	private readonly fotoFallida = signal(false);

	readonly iniciales = computed(() => inicialesDe(this.nombre()));

	/** URL utilizable: la del input mientras la imagen no haya fallado. */
	readonly fotoVisible = computed(() => {
		if (this.fotoFallida()) {
			return null;
		}
		return fotoUtil(this.foto()) ?? this.fotos.urlDe(this.usuarioId());
	});

	constructor() {
		// Si la persona sube otra foto, el avatar vuelve a intentar mostrarla.
		effect(() => {
			this.foto();
			this.usuarioId();
			this.tieneFoto();
			this.fotoFallida.set(false);
		});

		// La descarga se pide desde un efecto y no desde el computed: pedírsela a
		// una señal durante el cálculo lanzaría otra escritura de señal y
		// "ExpressionChangedAfterItHasBeenChecked" en desarrollo.
		effect(() => {
			if (this.tieneFoto()) {
				this.fotos.cargar(this.usuarioId());
			}
		});
	}

	marcarFotoFallida(): void {
		this.fotoFallida.set(true);
	}
}

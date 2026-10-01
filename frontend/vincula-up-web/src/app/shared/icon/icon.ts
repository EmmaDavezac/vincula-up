import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Nombres disponibles (mismo set que usa el prototipo con `lucide-react`). */
export type VuIconName =
	| 'arrow-left'
	| 'arrow-right'
	| 'bar-chart'
	| 'camera'
	| 'check'
	| 'chevron-down'
	| 'chevron-left'
	| 'chevron-right'
	| 'clock'
	| 'eye'
	| 'eye-off'
	| 'help-circle'
	| 'home'
	| 'lock'
	| 'log-out'
	| 'mail'
	| 'map-pin'
	| 'menu'
	| 'message-circle'
	| 'moon'
	| 'navigation'
	| 'paperclip'
	| 'pause'
	| 'pencil'
	| 'play'
	| 'plus'
	| 'search'
	| 'send'
	| 'star'
	| 'sun'
	| 'tag'
	| 'upload'
	| 'user-round'
	| 'users'
	| 'wrench'
	| 'x';

/**
 * Iconografía en línea con los trazos exactos de Lucide que usa el prototipo.
 * Se evita depender de la fuente Material (o de un paquete de iconos) para que
 * las pantallas se vean igual al prototipo.
 */
@Component({
	selector: 'vu-icon',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './icon.html',
	styles: [
		`
			:host {
				display: inline-flex;
				flex-shrink: 0;
				line-height: 0;
			}

			svg {
				display: block;
			}
		`,
	],
})
export class VuIcon {
	readonly name = input.required<VuIconName>();
	readonly size = input(18);
	readonly strokeWidth = input(2);
	/** Rellena el icono con el color actual (estrellas, puntos, etc.). */
	readonly filled = input(false);
}

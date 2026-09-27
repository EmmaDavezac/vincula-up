import { ChangeDetectionStrategy, Component, ElementRef, HostListener, afterNextRender, inject, input, output } from '@angular/core';
import { VuIcon, VuIconName } from '../icon/icon';

/**
 * Diálogo de confirmación único para toda la app.
 *
 * Antes cada pantalla confirmaba distinto (o nada) y el borrado de categorías usaba
 * el `window.confirm` del navegador, que se ve ajeno al diseño. Acá todas las
 * acciones que modifican o borran pasan por el mismo componente: título, qué va a
 * pasar, y un botón de confirmar que nombra la acción.
 *
 * Con `peligroso` el botón principal se pinta como acción destructiva y el foco
 * arranca en "Cancelar", para que un Enter a ciegas no borre nada.
 */
@Component({
	selector: 'vu-confirm',
	imports: [VuIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './confirm.html',
	styleUrl: './confirm.css',
})
export class VuConfirm {
	/** Encabezado de la pregunta. */
	readonly titulo = input.required<string>();
	/** Qué va a pasar, en una frase. */
	readonly mensaje = input.required<string>();
	/** Consecuencia o detalle relevante (opcional). */
	readonly detalle = input('');
	/** Texto del botón que confirma. */
	readonly textoConfirmar = input('Confirmar');
	/** Texto del botón que cancela. */
	readonly textoCancelar = input('Cancelar');
	/** Acción destructiva: Estilo de peligro y foco inicial en "Cancelar". */
	readonly peligro = input(false);
	/** Ícono del encabezado. */
	readonly icono = input<VuIconName>('pencil');
	/** Acción en curso: deshabilita los botones y evita el doble clic. */
	readonly cargando = input(false);

	readonly confirmado = output<void>();
	readonly cancelado = output<void>();

	private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;

	constructor() {
		afterNextRender(() => this.enfocar());
	}

	/**
	 * En acciones destructivas el foco queda en "Cancelar" (Enter no borra). En las
	 * reversibles queda en confirmar, que es lo que la persona quiere hacer.
	 */
	private enfocar(): void {
		const clase = this.peligro() ? '.vu-confirm__cancel' : '.vu-confirm__accept';
		const botones = this.host.nativeElement.querySelectorAll<HTMLButtonElement>(clase);
		botones[0]?.focus();
	}

	@HostListener('document:keydown.escape')
	cerrar(): void {
		if (!this.cargando()) {
			this.cancelado.emit();
		}
	}
}

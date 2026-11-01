import { ChangeDetectionStrategy, Component, DestroyRef, TemplateRef, ViewChild, AfterViewInit, inject, input, output } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
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
	imports: [VuIcon, MatButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './confirm.html',
	styleUrl: './confirm.css',
})
export class VuConfirm implements AfterViewInit {
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
	/** Pone la acción de cancelar como primaria cuando continuar es lo seguro. */
	readonly cancelarPrimario = input(false);
	/** Ícono del encabezado. */
	readonly icono = input<VuIconName>('pencil');
	/** Acción en curso: deshabilita los botones y evita el doble clic. */
	readonly cargando = input(false);

	readonly confirmado = output<void>();
	readonly cancelado = output<void>();

	private readonly dialog = inject(MatDialog);
	private readonly destroyRef = inject(DestroyRef);
	@ViewChild('confirmDialog') private confirmDialog!: TemplateRef<unknown>;
	private dialogRef?: MatDialogRef<unknown, string>;

	constructor() {
		this.destroyRef.onDestroy(() => this.dialogRef?.close());
	}

	ngAfterViewInit(): void {
		this.dialogRef = this.dialog.open(this.confirmDialog, {
			ariaLabel: this.titulo(),
			ariaModal: true,
			autoFocus: this.peligro() || this.cancelarPrimario() ? '.vu-confirm__cancel' : '.vu-confirm__accept',
			disableClose: true,
			panelClass: 'vu-confirm-dialog',
			role: 'alertdialog',
		});
		this.dialogRef.backdropClick().subscribe(() => this.cancelar());
		this.dialogRef.keydownEvents().subscribe((event) => {
			if (event.key === 'Escape') {
				this.cancelar();
			}
		});
		this.dialogRef.afterClosed().subscribe((result) => {
			if (result !== 'confirm' && result !== 'cancel') {
				this.cancelado.emit();
			}
		});
	}

	cancelar(): void {
		if (!this.cargando()) {
			this.dialogRef?.close('cancel');
			this.cancelado.emit();
		}
	}

	confirmar(): void {
		if (!this.cargando()) {
			this.dialogRef?.close('confirm');
			this.confirmado.emit();
		}
	}
}

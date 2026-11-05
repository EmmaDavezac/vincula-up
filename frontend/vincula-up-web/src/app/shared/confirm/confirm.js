import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, DestroyRef, ViewChild, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { VuIcon } from '../icon/icon';
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
let VuConfirm = class VuConfirm {
    /** Encabezado de la pregunta. */
    titulo = input.required();
    /** Qué va a pasar, en una frase. */
    mensaje = input.required();
    /** Consecuencia o detalle relevante (opcional). */
    detalle = input('');
    /** Texto del botón que confirma. */
    textoConfirmar = input('Confirmar');
    /** Texto del botón que cancela. */
    textoCancelar = input('Cancelar');
    /** Acción destructiva: Estilo de peligro y foco inicial en "Cancelar". */
    peligro = input(false);
    /** Pone la acción de cancelar como primaria cuando continuar es lo seguro. */
    cancelarPrimario = input(false);
    /** Ícono del encabezado. */
    icono = input('pencil');
    /** Acción en curso: deshabilita los botones y evita el doble clic. */
    cargando = input(false);
    confirmado = output();
    cancelado = output();
    dialog = inject(MatDialog);
    destroyRef = inject(DestroyRef);
    confirmDialog;
    dialogRef;
    constructor() {
        this.destroyRef.onDestroy(() => this.dialogRef?.close());
    }
    ngAfterViewInit() {
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
    cancelar() {
        if (!this.cargando()) {
            this.dialogRef?.close('cancel');
            this.cancelado.emit();
        }
    }
    confirmar() {
        if (!this.cargando()) {
            this.dialogRef?.close('confirm');
            this.confirmado.emit();
        }
    }
};
__decorate([
    ViewChild('confirmDialog')
], VuConfirm.prototype, "confirmDialog", void 0);
VuConfirm = __decorate([
    Component({
        selector: 'vu-confirm',
        imports: [VuIcon, MatButtonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        templateUrl: './confirm.html',
        styleUrl: './confirm.css',
    })
], VuConfirm);
export { VuConfirm };

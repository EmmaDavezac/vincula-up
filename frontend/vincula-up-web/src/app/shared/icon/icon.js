import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
/**
 * Iconografía en línea con los trazos exactos de Lucide que usa el prototipo.
 * Se evita depender de la fuente Material (o de un paquete de iconos) para que
 * las pantallas se vean igual al prototipo.
 */
let VuIcon = class VuIcon {
    name = input.required();
    size = input(18);
    strokeWidth = input(2);
    /** Rellena el icono con el color actual (estrellas, puntos, etc.). */
    filled = input(false);
};
VuIcon = __decorate([
    Component({
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
], VuIcon);
export { VuIcon };

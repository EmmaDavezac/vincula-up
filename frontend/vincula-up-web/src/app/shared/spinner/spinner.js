import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
/**
 * Spinner de carga reutilizable.
 *
 * Se usa mientras se cierra la sesión, mientras cargan los mapas
 * (Leaflet / iframe de OpenStreetMap) y mientras se detecta la ubicación
 * del dispositivo o se verifica una dirección.
 *
 * Responde al tema claro/oscuro mediante `--ink` y a
 * `prefers-reduced-motion` (se detiene si el usuario desactivó las animaciones).
 */
let VuSpinner = class VuSpinner {
    /** Texto de accesibilidad del spinner. */
    etiqueta = input('Cargando…');
    /** Tamaño: `sm` (1.25rem) o `md` (2rem). */
    size = input('md');
};
VuSpinner = __decorate([
    Component({
        selector: 'vu-spinner',
        standalone: true,
        changeDetection: ChangeDetectionStrategy.OnPush,
        styleUrl: './spinner.css',
        template: `
		<div class="vu-spinner" [attr.aria-label]="etiqueta()" role="status">
			<span class="vu-sr-only">{{ etiqueta() }}</span>
			<div class="vu-spinner__anillo"></div>
		</div>
	`,
    })
], VuSpinner);
export { VuSpinner };

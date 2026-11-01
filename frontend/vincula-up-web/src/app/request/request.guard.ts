import { CanDeactivateFn } from '@angular/router';

interface RequestExitConfirmation {
	confirmarSalidaPendiente(): boolean | Promise<boolean>;
}

export const confirmarSalidaDeSolicitud: CanDeactivateFn<RequestExitConfirmation> = (component) =>
	component.confirmarSalidaPendiente();
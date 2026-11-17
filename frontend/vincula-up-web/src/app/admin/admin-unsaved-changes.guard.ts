import { CanDeactivateFn } from '@angular/router';

export interface AdminUnsavedChanges {
	confirmarSalidaPendiente(): boolean | Promise<boolean>;
}

export const confirmarSalidaDeFormularioAdmin: CanDeactivateFn<AdminUnsavedChanges> = (component) =>
	component.confirmarSalidaPendiente();

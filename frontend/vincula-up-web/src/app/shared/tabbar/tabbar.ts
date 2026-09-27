import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { VuIcon, VuIconName } from '../icon/icon';

/** Sección de la barra inferior. */
interface TabSection {
	path: string;
	label: string;
	icon: VuIconName;
	/** Marca activa exacta: sólo "Resumen" matchea la raíz del panel. */
	exact: boolean;
}

/**
* Barra inferior de navegación, la misma en todo el sitio y en el panel de
* administración (sólo móvil). En escritorio la navegación vive en la barra
* superior, así que acá no se muestra.
* <p>
* Las secciones dependen del rol: el administrador recorre su panel, y el resto
* de los usuarios las pantallas que les corresponden.
*/
@Component({
	selector: 'vu-tabbar',
	imports: [RouterLink, RouterLinkActive, VuIcon],
	templateUrl: './tabbar.html',
	styleUrl: './tabbar.css',
})
export class VuTabbar {
	private readonly auth = inject(AuthService);

	protected readonly secciones = computed<ReadonlyArray<TabSection>>(() => {
		if (this.auth.hasRole('ADMIN')) {
			return [
				{ path: '/admin', label: 'Resumen', icon: 'bar-chart', exact: true },
				{ path: '/admin/profesionales', label: 'Profesionales', icon: 'users', exact: false },
				{ path: '/admin/categorias', label: 'Categorías', icon: 'tag', exact: false },
				{ path: '/admin/clientes', label: 'Clientes', icon: 'user-round', exact: false },
			];
		}
		if (this.auth.hasRole('CLIENTE')) {
			return [
				{ path: '/', label: 'Inicio', icon: 'home', exact: true },
				{ path: '/solicitudes', label: 'Mis solicitudes', icon: 'clock', exact: false },
				{ path: '/solicitar', label: 'Solicitar', icon: 'wrench', exact: false },
				{ path: '/mi-cuenta', label: 'Mi cuenta', icon: 'user-round', exact: false },
			];
		}
		if (this.auth.hasRole('PROFESIONAL')) {
			const secciones: TabSection[] = [
				{ path: '/', label: 'Inicio', icon: 'home', exact: true },
				{ path: '/solicitudes', label: 'Mis solicitudes', icon: 'clock', exact: false },
			];
			// Mientras el perfil no está activo, la sección de más valor es completarlo.
			if (!this.auth.isProfessionalActive()) {
				secciones.push({
					path: '/activar-perfil',
					label: 'Activar perfil',
					icon: 'navigation',
					exact: false,
				});
			}
			secciones.push({ path: '/mi-cuenta', label: 'Mi cuenta', icon: 'user-round', exact: false });
			return secciones;
		}
		// Visitante sin sesión: información y acceso. "Crear cuenta" no entra
		// como sección porque no es una pantalla de la app (arranca en Keycloak):
		// ese botón queda en la barra superior, también en móvil.
		return [
			{ path: '/', label: 'Inicio', icon: 'home', exact: true },
			{ path: '/como-funciona', label: 'Cómo funciona', icon: 'arrow-right', exact: false },
			{ path: '/ingresar', label: 'Ingresar', icon: 'lock', exact: false },
		];
	});
}

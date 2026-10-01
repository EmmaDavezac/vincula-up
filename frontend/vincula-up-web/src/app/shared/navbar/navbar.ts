import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { TemaService } from '../../core/services/tema.service';
import { UserRole } from '../../core/models/user-profile';
import { VuAvatar } from '../avatar/avatar';
import { VuConfirm } from '../confirm/confirm';
import { VuIcon } from '../icon/icon';

@Component({
	selector: 'app-navbar',
	standalone: true,
	imports: [RouterLink, RouterLinkActive, VuAvatar, VuConfirm, VuIcon],
	templateUrl: './navbar.html',
	styleUrl: './navbar.css',
})
export class NavbarComponent {
	protected readonly auth = inject(AuthService);
	/** Tema claro/oscuro. El toggle vive en la barra y no pide sesión. */
	protected readonly tema = inject(TemaService);
	protected userMenuOpen = false;

	private readonly router = inject(Router);
	private readonly urlActual = signal(this.router.url);

	/**
	* Dentro del panel la barra superior muestra sus cuatro secciones (antes
	* vivían en una columna lateral). Fuera del panel, muestra el acceso al panel.
	*/
	protected readonly enPanel = computed(() => this.urlActual().startsWith('/admin'));

	constructor() {
		this.router.events
			.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
			.subscribe((event) => this.urlActual.set(event.urlAfterRedirects));
	}

	/** Cerrar sesión pide confirmación: un clic de paso no debería desloguear. */
	salir(): void {
		this.userMenuOpen = false;
		this.confirmarSalida.set(true);
	}

	readonly confirmarSalida = signal(false);

	confirmarCierreDeSesion(): void {
		this.confirmarSalida.set(false);
		this.auth.logout();
	}

	crearCuenta(): void {
		this.auth.registerWithKeycloak();
	}

	roleTexto(role: UserRole | undefined): string {
		return (
			{ CLIENTE: 'Cliente', PROFESIONAL: 'Profesional', ADMIN: 'Administrador' }[
				role ?? 'CLIENTE'
			] ?? 'Cliente'
		);
	}
}

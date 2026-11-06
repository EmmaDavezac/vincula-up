import { __decorate } from "tslib";
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { TemaService } from '../../core/services/tema.service';
import { NotificationService } from '../../core/services/notification.service';
import { VuAvatar } from '../avatar/avatar';
import { VuConfirm } from '../confirm/confirm';
import { VuIcon } from '../icon/icon';
import { VuSpinner } from '../spinner/spinner';
let NavbarComponent = class NavbarComponent {
    auth = inject(AuthService);
    /** Tema claro/oscuro. El toggle vive en la barra y no pide sesión. */
    tema = inject(TemaService);
    notificaciones = inject(NotificationService);
    userMenuOpen = false;
    notificationsOpen = false;
    router = inject(Router);
    urlActual = signal(this.router.url);
    /**
    * Dentro del panel la barra superior muestra sus cuatro secciones (antes
    * vivían en una columna lateral). Fuera del panel, muestra el acceso al panel.
    */
    enPanel = computed(() => this.urlActual().startsWith('/admin'));
    constructor() {
        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event) => this.urlActual.set(event.urlAfterRedirects));
    }
    /** Cerrar sesión pide confirmación: un clic de paso no debería desloguear. */
    salir() {
        this.userMenuOpen = false;
        this.confirmarSalida.set(true);
    }
    confirmarSalida = signal(false);
    /** Indica que el cierre de sesión está en curso: se muestra el spinner. */
    cerrandoSesion = signal(false);
    confirmarCierreDeSesion() {
        this.confirmarSalida.set(false);
        this.cerrandoSesion.set(true);
        this.auth.logout();
    }
    crearCuenta() {
        this.auth.registerWithKeycloak();
    }
    alternarNotificaciones() {
        this.notificationsOpen = !this.notificationsOpen;
        if (this.notificationsOpen)
            this.notificaciones.markAllRead();
    }
    abrirSolicitudes() {
        this.notificationsOpen = false;
        void this.router.navigateByUrl('/solicitudes');
    }
    roleTexto(role) {
        return ({ CLIENTE: 'Cliente', PROFESIONAL: 'Profesional', ADMIN: 'Administrador' }[role ?? 'CLIENTE'] ?? 'Cliente');
    }
};
NavbarComponent = __decorate([
    Component({
        selector: 'app-navbar',
        standalone: true,
        imports: [DatePipe, RouterLink, RouterLinkActive, VuAvatar, VuConfirm, VuIcon, VuSpinner],
        templateUrl: './navbar.html',
        styleUrl: './navbar.css',
    })
], NavbarComponent);
export { NavbarComponent };

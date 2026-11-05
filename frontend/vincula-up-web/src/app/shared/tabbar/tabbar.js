import { __decorate } from "tslib";
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { VuIcon } from '../icon/icon';
/**
* Barra inferior de navegación, la misma en todo el sitio y en el panel de
* administración (sólo móvil). En escritorio la navegación vive en la barra
* superior, así que acá no se muestra.
* <p>
* Las secciones dependen del rol: el administrador recorre su panel, y el resto
* de los usuarios las pantallas que les corresponden.
*/
let VuTabbar = class VuTabbar {
    auth = inject(AuthService);
    secciones = computed(() => {
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
            const secciones = [
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
            { path: '/preguntas-frecuentes', label: 'Preguntas', icon: 'help-circle', exact: false },
            { path: '/ingresar', label: 'Ingresar', icon: 'lock', exact: false },
        ];
    });
};
VuTabbar = __decorate([
    Component({
        selector: 'vu-tabbar',
        imports: [RouterLink, RouterLinkActive, VuIcon],
        templateUrl: './tabbar.html',
        styleUrl: './tabbar.css',
    })
], VuTabbar);
export { VuTabbar };

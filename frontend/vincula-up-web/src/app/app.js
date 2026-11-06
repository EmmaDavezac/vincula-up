import { __decorate } from "tslib";
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { AdminFooterComponent } from './shared/footer/admin-footer';
import { VuTabbar } from './shared/tabbar/tabbar';
import { TerminosModal } from './legal/terminos-modal';
import { AuthService } from './core/services/auth.service';
import { AuthLoading } from './shared/auth-loading/auth-loading';
import { VuToasts } from './shared/toasts/toasts';
let App = class App {
    auth = inject(AuthService);
    router = inject(Router);
    urlActual = signal(this.router.url);
    enPanelAdmin = computed(() => this.urlActual().startsWith('/admin'));
    constructor() {
        this.router.events
            .pipe(filter((event) => event instanceof NavigationEnd))
            .subscribe((event) => this.urlActual.set(event.urlAfterRedirects));
    }
};
App = __decorate([
    Component({
        imports: [RouterOutlet, NavbarComponent, FooterComponent, AdminFooterComponent, VuTabbar, TerminosModal, AuthLoading, VuToasts],
        selector: 'app-root',
        styleUrl: './app.css',
        templateUrl: './app.html',
    })
], App);
export { App };

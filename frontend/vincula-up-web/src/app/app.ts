import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/navbar/navbar';
import { FooterComponent } from './shared/footer/footer';
import { AdminFooterComponent } from './shared/footer/admin-footer';
import { VuTabbar } from './shared/tabbar/tabbar';
import { TerminosModal } from './legal/terminos-modal';
import { AuthService } from './core/services/auth.service';
import { LoadingScreen } from './shared/loading-screen/loading-screen';

@Component({
  imports: [RouterOutlet, NavbarComponent, FooterComponent, AdminFooterComponent, VuTabbar, TerminosModal, LoadingScreen],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly urlActual = signal(this.router.url);

  /**
   * El panel de administración usa la misma barra superior que el resto del
   * sitio; lo único que se oculta es el footer, que no aporta en un panel.
   */
  readonly enPanelAdmin = computed(() => this.urlActual().startsWith('/admin'));

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.urlActual.set(event.urlAfterRedirects));
  }
}

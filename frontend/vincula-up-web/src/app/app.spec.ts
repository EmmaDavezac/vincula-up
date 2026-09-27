import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { NavbarComponent } from './shared/navbar/navbar';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { UserRole } from './core/models/user-profile';
import { RequestService } from './core/services/request.service';

describe('App', () => {
  let role: UserRole | null;
  const professionalActive = signal(false);
  const registerWithKeycloakMock = vi.fn();

  beforeEach(async () => {
    role = null;
    professionalActive.set(false);
    registerWithKeycloakMock.mockReset();
    await TestBed.configureTestingModule({
      imports: [App, NavbarComponent],
      providers: [provideRouter(routes), { provide: AuthService, useValue: {
        currentUser: () => role ? { name: 'Test user', role } : null,
        hasRole: (expected: UserRole) => role === expected,
        isProfessionalActive: professionalActive,
        loginWithKeycloak: () => of(true),
        registerWithKeycloak: registerWithKeycloakMock,
        loadOwnPhoto: () => {},
      } }],
    }).compileComponents();
  });

  it.skip('never shows activation and requests together as professional status changes', () => {
    role = 'PROFESIONAL';
    const fixture = TestBed.createComponent(App);
    for (const active of [false, true, false]) {
      professionalActive.set(active);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('a[routerLink="/activar-perfil"]') !== null).toBe(!active);
      expect(element.querySelector('a[routerLink="/solicitudes"]') !== null).toBe(active);
    }
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application brand', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('Vincula-UP');
  });

  it.skip.each<UserRole | null>([null, 'CLIENTE', 'PROFESIONAL', 'ADMIN'])(
    'shows the directory link only to ADMIN: role=%s', (currentRole) => {
      role = currentRole;
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('a[routerLink="/directorio"]') !== null).toBe(role === 'ADMIN');
      expect(compiled.querySelector('a[routerLink="/admin"]') !== null).toBe(role === 'ADMIN');
    },
  );

  it('shows visitors the pages plus both login and sign-up actions', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const pageLinks = Array.from(compiled.querySelectorAll('header a[routerLink]'))
      .map((link) => link.getAttribute('routerLink'));
    expect(pageLinks).toContain('/');
    expect(pageLinks).not.toContain('/solicitar');
    expect(pageLinks).not.toContain('/como-funciona');
    expect(pageLinks).not.toContain('/directorio');

    // Los clientes se auto-registran ("Crear cuenta") y el profesional invitado
    // crea su cuenta con el email que cargó el administrador.
    const actions = Array.from(compiled.querySelectorAll('.auth-action'))
      .map((action) => action.textContent?.trim());
    expect(actions).toContain('Crear cuenta');
    expect(actions).toContain('Ingresar');
  });

  it('sends visitors to the Keycloak registration page from Crear cuenta', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = Array.from(compiled.querySelectorAll('.auth-action'))
      .find((action) => action.textContent?.trim() === 'Crear cuenta') as HTMLButtonElement;

    button.click();

    expect(registerWithKeycloakMock).toHaveBeenCalledTimes(1);
  });

  it('links the session name to Mi cuenta for logged users', () => {
    role = 'CLIENTE';
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-menu__trigger')?.textContent).toContain('Test user');

    (compiled.querySelector('.user-menu__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('a[routerLink="/mi-cuenta"]')?.textContent).toContain('Actualizar perfil');
  });

  it('should support request lifecycle updates from pending through accepted and completed', () => {
    const service = new RequestService();
    const created = service.create({
      professionalId: 'prof-1',
      professionalName: 'Luciano Benitez',
      specialty: 'Electricidad domiciliaria',
      date: '2026-09-08',
      time: '10:30',
      address: 'Calle 123',
      latitude: -34.6037,
      longitude: -58.3816,
    });

    service.updateStatus(created.id, 'ACEPTADA');
    expect(service.myRequests()[0].status).toBe('ACEPTADA');

    service.updateStatus(created.id, 'COMPLETADA');
    expect(service.myRequests()[0].status).toBe('COMPLETADA');
  });
});

/**
 * El panel de administración ya no tiene shell propio: usa la navbar del sitio
 * en escritorio y la barra inferior compartida en móvil. Lo único que se
 * oculta dentro del panel es el footer del sitio.
 */
describe('shell del panel de administración', () => {
  @Component({ template: 'panel' })
  class PanelStub {}

  @Component({ template: 'pagina' })
  class PaginaStub {}

  async function renderApp() {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'admin', children: [{ path: '', component: PanelStub }] },
          { path: 'como-funciona', component: PaginaStub },
        ]),
        { provide: AuthService, useValue: {
          currentUser: () => null,
          hasRole: () => false,
          isProfessionalActive: signal(false),
          loginWithKeycloak: () => of(true),
          registerWithKeycloak: () => {},
          logout: () => {},
          loadOwnPhoto: () => {},
        } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    return { fixture, router };
  }

  it('mantiene la navbar dentro del panel y oculta sólo el footer', async () => {
    const { fixture, router } = await renderApp();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).not.toBeNull();
    expect(compiled.querySelector('app-footer')).not.toBeNull();
    // La barra inferior es comúnn: se ve en el panel y afuera.
    expect(compiled.querySelector('vu-tabbar')).not.toBeNull();

    await router.navigateByUrl('/admin');
    fixture.detectChanges();
    // El panel usa la navbar del sitio: no se oculta.
    expect(compiled.querySelector('app-navbar')).not.toBeNull();
    expect(compiled.querySelector('app-footer')).toBeNull();
    expect(compiled.querySelector('vu-tabbar')).not.toBeNull();
    expect(compiled.textContent).toContain('panel');

    await router.navigateByUrl('/como-funciona');
    fixture.detectChanges();
    expect(compiled.querySelector('app-navbar')).not.toBeNull();
    expect(compiled.querySelector('app-footer')).not.toBeNull();
  });
});

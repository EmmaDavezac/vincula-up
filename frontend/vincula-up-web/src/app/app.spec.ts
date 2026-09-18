import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { UserRole } from './core/models/user-profile';
import { RequestService } from './core/services/request.service';

describe('App', () => {
  let role: UserRole | null;
  const professionalActive = signal(false);

  beforeEach(async () => {
    role = null;
    professionalActive.set(false);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: AuthService, useValue: {
        currentUser: () => role ? { name: 'Test user', role } : null,
        hasRole: (expected: UserRole) => role === expected,
        isProfessionalActive: professionalActive,
      } }],
    }).compileComponents();
  });

  it('never shows activation and requests together as professional status changes', () => {
    role = 'PROFESIONAL';
    const fixture = TestBed.createComponent(App);
    for (const active of [false, true, false]) {
      professionalActive.set(active);
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('a[href="/activar-perfil"]') !== null).toBe(!active);
      expect(element.querySelector('a[href="/mis-solicitudes"]') !== null).toBe(active);
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

  it.each<UserRole | null>([null, 'CLIENTE', 'PROFESIONAL', 'ADMIN'])(
    'shows the directory link only to ADMIN: role=%s', (currentRole) => {
      role = currentRole;
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('a[href="/directorio"]') !== null).toBe(role === 'ADMIN');
      expect(compiled.querySelector('a[href="/admin"]') !== null).toBe(role === 'ADMIN');
    },
  );

  it('shows visitors only home, how it works and the login action', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const pageLinks = Array.from(compiled.querySelectorAll('a[href^="/"]'))
      .map((link) => link.getAttribute('href'));
    expect(pageLinks).toEqual(['/', '/como-funciona']);
    expect(compiled.querySelector('.header-action')?.textContent).toContain('Ingresar');
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

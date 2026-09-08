import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { RequestService } from './core/services/request.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
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

  it('should support request lifecycle updates from pending through accepted and completed', () => {
    const service = new RequestService();
    const created = service.create({
      professionalId: 'prof-1',
      professionalName: 'Luciano Benitez',
      specialty: 'Electricidad domiciliaria',
      date: '2026-09-08',
      time: '10:30',
      address: 'Calle 123',
    });

    service.updateStatus(created.id, 'ACEPTADA');
    expect(service.myRequests()[0].status).toBe('ACEPTADA');

    service.updateStatus(created.id, 'COMPLETADA');
    expect(service.myRequests()[0].status).toBe('COMPLETADA');
  });
});

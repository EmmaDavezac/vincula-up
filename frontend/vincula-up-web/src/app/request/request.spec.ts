import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Request } from './request';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { DirectoryService } from '../core/services/directory.service';

// Backend response fixture: no invented display name, rating or availability.
const professional = {
  id: 'profile-from-api', usuarioId: 'user-from-api', legajo: 'P-987',
  estado: 'ACTIVO', fotoUrl: '/uploads/profile-from-api.jpg',
  especialidades: [{ id: 'specialty-from-api', nombre: 'Electricidad' }],
};

describe('Request real professionals', () => {
  const api = { getProfessionals: vi.fn(), getSpecialtiesMap: vi.fn() };

  beforeEach(() => {
    api.getProfessionals.mockReset().mockReturnValue(of([professional]));
    // Catálogo de especialidades: el paso 2 muestra todas las publicadas.
    api.getSpecialtiesMap.mockReset().mockReturnValue(of({ 'specialty-from-api': 'Electricidad' }));
    TestBed.configureTestingModule({
      imports: [Request],
      providers: [provideRouter([]), { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: {} }],
    });
  });

  /**
   * El prototipo pide 4 pasos: ubicación → especialidad → día y horario →
   * profesional. Para caer en la lista de profesionales hay que completar los tres
   * (el paso 2 además exige el resumen del problema).
   */
  function renderProfessionals() {
    const fixture = TestBed.createComponent(Request);
    const cmp = fixture.componentInstance;
    cmp.step.set('specialty');
    cmp.selectSpecialty('Electricidad');
    cmp.problemSummary.set('Se corta la luz en la cocina y no vuelve.');
    cmp.continuar();
    cmp.elegirDia('LUN');
    cmp.elegirHorario('MANANA');
    cmp.continuar();
    fixture.detectChanges();
    return fixture;
  }

  it('renders the API photo and selects the actual professional ID', () => {
    const fixture = renderProfessionals();
    const element = fixture.nativeElement as HTMLElement;
    expect(api.getProfessionals).toHaveBeenCalledWith(undefined, false);
    expect(element.querySelector('vu-avatar img')?.getAttribute('src')).toBe(professional.fotoUrl);
    expect(element.textContent).toContain('Electricidad');
    element.querySelector<HTMLButtonElement>('.professional-pick')!.click();
    expect(fixture.componentInstance.form().professionalId).toBe(professional.id);
  });

  it('turns a chosen day and slot into the date and time sent to the backend', () => {
    const fixture = TestBed.createComponent(Request);
    const cmp = fixture.componentInstance;
    cmp.step.set('schedule');
    cmp.elegirDia('VIE');
    cmp.elegirHorario('TARDE');
    expect(cmp.date()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cmp.time()).toBe('16:00');
    expect(cmp.selectedSlotLabel).toBe('16:00 a 20:00 hs');
  });

  it('keeps the step order of the prototype and blocks Continuar until the step is complete', () => {
    const fixture = TestBed.createComponent(Request);
    const cmp = fixture.componentInstance;
    expect(cmp.pasoActual).toBe(1);
    expect(cmp.tituloPaso).toBe('¿Dónde necesitás el servicio?');
    expect(cmp.canContinue).toBe(false);

    cmp.address.set('25 de Mayo 742');
    expect(cmp.canContinue).toBe(true);
    cmp.continuar();
    expect(cmp.pasoActual).toBe(2);
    expect(cmp.canContinue).toBe(false);

    // Con categoría pero sin resumen todavía no se puede seguir: el resumen es obligatorio.
    cmp.selectSpecialty('Electricidad');
    expect(cmp.canContinue).toBe(false);
    cmp.problemSummary.set('Se corta');
    expect(cmp.resumenValido()).toBe(false);
    expect(cmp.canContinue).toBe(false);
    cmp.problemSummary.set('Se corta la luz en la cocina y no vuelve.');
    expect(cmp.canContinue).toBe(true);
    cmp.continuar();
    expect(cmp.pasoActual).toBe(3);
    expect(cmp.tituloPaso).toBe('¿Cuándo te viene bien?');

    cmp.elegirDia('LUN');
    expect(cmp.canContinue).toBe(false);
    cmp.elegirHorario('MANANA');
    expect(cmp.canContinue).toBe(true);
    cmp.continuar();
    expect(cmp.pasoActual).toBe(4);
    expect(cmp.tituloPaso).toBe('Elegí un profesional');

    cmp.goBack();
    expect(cmp.pasoActual).toBe(3);
  });

  /** El resumen del problema se pide en el paso 2 y viaja al backend. */
  it('exige el resumen del problema y lo manda al crear la solicitud', () => {
    // Fixture con UUIDs válidos: el submit los exige para llegar al POST.
    const uuid = '11111111-1111-1111-1111-111111111111';
    const prof = {
      id: uuid, usuarioId: '22222222-2222-2222-2222-222222222222', legajo: 'P-1',
      estado: 'ACTIVO', nombre: 'Luciano', apellido: 'Benitez', specialty: 'Electricidad',
      especialidades: [{ id: '33333333-3333-3333-3333-333333333333', nombre: 'Electricidad' }],
    };
    const createRequest = vi.fn().mockReturnValue(of({ id: 1 }));
    const apiCompleto = { getProfessionals: vi.fn().mockReturnValue(of([prof])), getSpecialtiesMap: vi.fn().mockReturnValue(of({})), createRequest, describeError: (e: unknown, f: string) => f };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Request],
      providers: [provideRouter([]), { provide: ApiService, useValue: apiCompleto },
        { provide: AuthService, useValue: { currentUser: () => ({ id: '44444444-4444-4444-4444-444444444444', name: 'Sofía', role: 'CLIENTE' }) } }],
    });
    const fixture = TestBed.createComponent(Request);
    const cmp = fixture.componentInstance;

    // Sin resumen no se puede ni avanzar del paso 2.
    cmp.step.set('specialty');
    cmp.selectSpecialty('Electricidad');
    cmp.problemSummary.set('   ');
    expect(cmp.resumenValido()).toBe(false);
    expect(cmp.canContinue).toBe(false);

    cmp.problemSummary.set('  Se corta la luz en la cocina y no vuelve.  ');
    expect(cmp.canContinue).toBe(true);
    cmp.continuar();
    cmp.elegirDia('LUN');
    cmp.elegirHorario('MANANA');
    cmp.continuar();
    cmp.selectProfessional(cmp.filteredProfessionals()[0]);
    cmp.address.set('25 de Mayo 742');
    cmp.location.set({ lat: -34.6, lng: -58.38, displayName: '25 de Mayo 742', detecting: false, editing: false });
    cmp.submit();

    expect(createRequest).toHaveBeenCalledWith(expect.objectContaining({
      descripcion: 'Se corta la luz en la cocina y no vuelve.',
    }));
  });

  it('uses initials, not another person’s photo, when the image fails', () => {
    const fixture = renderProfessionals();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.vu-avatar')).not.toBeNull();
  });

  it('shows initials when there is no registered photo', () => {
    api.getProfessionals.mockReturnValue(of([{ ...professional, fotoUrl: null }]));
    const fixture = renderProfessionals();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.vu-avatar')).not.toBeNull();
  });

  it('excludes inactive, suspended and unverified statuses', () => {
    api.getProfessionals.mockReturnValue(of([
      professional,
      ...['CARGADO', 'SUSPENDIDO', undefined].map((estado) => ({ ...professional, id: String(estado), estado })),
    ]));
    const fixture = renderProfessionals();
    expect(fixture.componentInstance.allProfessionals().map((p) => p.id)).toEqual([professional.id]);
  });

  it('does not insert demo professionals when the API is empty', () => {
    api.getProfessionals.mockReturnValue(of([]));
    const fixture = renderProfessionals();
    expect(fixture.componentInstance.allProfessionals()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.professional-pick')).toBeNull();
  });

  it('shows a load error instead of demo or previously cached professionals', () => {
    const directory = TestBed.inject(DirectoryService);
    directory.loadProfessionals(true).subscribe();
    expect(directory.getProfessionals()).toHaveLength(1);
    api.getProfessionals.mockReturnValue(throwError(() => new Error('Unavailable')));
    const fixture = TestBed.createComponent(Request);
    fixture.componentInstance.step.set('specialty');
    fixture.detectChanges();
    expect(fixture.componentInstance.allProfessionals()).toEqual([]);
    expect(directory.getProfessionals()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('No se pudieron cargar los profesionales');
  });
});

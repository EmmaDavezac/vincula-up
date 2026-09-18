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
  const api = { getProfessionals: vi.fn() };

  beforeEach(() => {
    api.getProfessionals.mockReset().mockReturnValue(of([professional]));
    TestBed.configureTestingModule({
      imports: [Request],
      providers: [provideRouter([]), { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: {} }],
    });
  });

  function renderProfessionals() {
    const fixture = TestBed.createComponent(Request);
    fixture.componentInstance.selectSpecialty('Electricidad');
    fixture.detectChanges();
    return fixture;
  }

  it('renders the API photo and selects the actual professional ID', () => {
    const fixture = renderProfessionals();
    const element = fixture.nativeElement as HTMLElement;
    expect(api.getProfessionals).toHaveBeenCalledWith(undefined, false);
    expect(element.querySelector('img.avatar-photo')?.getAttribute('src')).toBe(professional.fotoUrl);
    expect(element.textContent).toContain('P-987');
    element.querySelector<HTMLButtonElement>('.request-btn')!.click();
    expect(fixture.componentInstance.form().professionalId).toBe(professional.id);
  });

  it('uses initials, not another person’s photo, when the image fails', () => {
    const fixture = renderProfessionals();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('[aria-label="Sin foto disponible"]')).not.toBeNull();
  });

  it('shows initials when there is no registered photo', () => {
    api.getProfessionals.mockReturnValue(of([{ ...professional, fotoUrl: null }]));
    const fixture = renderProfessionals();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.avatar')).not.toBeNull();
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
    expect(fixture.nativeElement.querySelector('.professional-card')).toBeNull();
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

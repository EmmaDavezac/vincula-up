import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Activation } from './activation';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';

describe('Activation interactions', () => {
  let fixture: ComponentFixture<Activation>;
  let saved: Subject<unknown>;
  const api = {
    activateProfessional: vi.fn(), setAvailability: vi.fn(),
    describeError: (_error: unknown, fallback: string) => fallback,
  };
  const auth = {
    currentUser: () => ({ id: 'user-1' }), getKeycloakId: () => 'identity-1',
    setProfessionalActive: vi.fn(),
  };

  beforeEach(async () => {
    saved = new Subject<unknown>();
    api.activateProfessional.mockReset().mockReturnValue(of({ id: 'professional-1', estado: 'ACTIVO' }));
    api.setAvailability.mockReset().mockReturnValue(saved);
    auth.setProfessionalActive.mockClear();
    await TestBed.configureTestingModule({
      imports: [Activation], providers: [provideRouter([]),
        { provide: ApiService, useValue: api }, { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(Activation);
    fixture.detectChanges();
  });

  function click(selector: string) {
    const button = fixture.nativeElement.querySelector(selector) as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();
  }

  it('reads the selected image and renders its preview, including after returning from location', async () => {
    const bytes = Uint8Array.from(atob(image.split(',')[1]), (c) => c.charCodeAt(0));
    const file = new File([bytes], 'perfil.png', { type: 'image/png' });
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(fixture.componentInstance.photoLoading()).toBe(false));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview-avatar-img').getAttribute('src')).toBe(image);
    click('.next');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#zone-query-input')).not.toBeNull();
    click('.back');
    expect(fixture.nativeElement.querySelector('.preview-avatar-img').getAttribute('src')).toBe(image);
  });

  it('selects several days by clicking, submits every day, and waits for availability to save', async () => {
    fixture.componentInstance.photoPreview.set(image);
    fixture.detectChanges();
    click('.next');
    await fixture.whenStable();
    fixture.detectChanges();
    click('.next');
    fixture.componentInstance.selectedDays.set([]);
    fixture.detectChanges();
    for (const day of ['Lunes', 'Miércoles', 'Viernes']) click(`[aria-label="${day}"]`);
    expect(fixture.nativeElement.querySelectorAll('[aria-pressed="true"]').length).toBe(3);
    expect(fixture.componentInstance.selectedDays()).toEqual(['LUNES', 'MIERCOLES', 'VIERNES']);
    click('.next');
    expect(api.setAvailability).toHaveBeenCalledWith('professional-1', [
      { diaSemana: 'LUNES', horaInicio: '09:00:00', horaFin: '18:00:00' },
      { diaSemana: 'MIERCOLES', horaInicio: '09:00:00', horaFin: '18:00:00' },
      { diaSemana: 'VIERNES', horaInicio: '09:00:00', horaFin: '18:00:00' },
    ]);
    expect(api.activateProfessional.mock.calls[0][0].fotoUrl).toBe(image);
    expect(fixture.componentInstance.completed()).toBe(false);
    saved.next([]);
    saved.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.complete-state')).not.toBeNull();
  });

  it('preserves selected days after a save failure and retries without reactivating', () => {
    fixture.componentInstance.photoPreview.set(image);
    api.setAvailability.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    fixture.componentInstance.step.set(3);
    fixture.componentInstance.selectedDays.set(['MARTES', 'JUEVES']);
    fixture.detectChanges();
    click('.next');
    expect(fixture.componentInstance.completed()).toBe(false);
    expect(fixture.componentInstance.errorMessage()).toContain('no se guardaron los horarios');
    expect(fixture.componentInstance.selectedDays()).toEqual(['MARTES', 'JUEVES']);
    click('.next');
    expect(api.activateProfessional).toHaveBeenCalledTimes(1);
    expect(api.setAvailability).toHaveBeenCalledTimes(2);
  });

  it('disables continue without a photo and again after removing it', () => {
    const component = fixture.componentInstance;
    const nextButton = () => fixture.nativeElement.querySelector('.next') as HTMLButtonElement;
    expect(nextButton().disabled).toBe(true);
    click('.next');
    expect(component.step()).toBe(1);

    component.photoPreview.set(image);
    fixture.detectChanges();
    expect(nextButton().disabled).toBe(false);
    click('.btn-remove-photo');
    expect(component.photoPreview()).toBe('');
    expect(nextButton().disabled).toBe(true);
    click('.next');
    expect(component.step()).toBe(1);
    expect(api.activateProfessional).not.toHaveBeenCalled();

    component.photoPreview.set(image);
    fixture.detectChanges();
    expect(nextButton().disabled).toBe(false);
    click('.next');
    expect(component.step()).toBe(2);
  });

  it('blocks form submission without a photo even from the final step', () => {
    const component = fixture.componentInstance;
    component.step.set(3);
    component.next();
    expect(component.step()).toBe(1);
    expect(component.photoError()).toContain('foto de perfil');
    expect(api.activateProfessional).not.toHaveBeenCalled();
    expect(api.setAvailability).not.toHaveBeenCalled();
  });

  it('blocks continuing while the photo is loading', () => {
    const component = fixture.componentInstance;
    component.photoPreview.set(image);
    component.photoLoading.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.next') as HTMLButtonElement).disabled).toBe(true);
    component.next();
    expect(component.step()).toBe(1);
  });

  it('rejects images larger than 512 KiB', () => {
    const component = fixture.componentInstance;
    const big = new File([new Uint8Array(600 * 1024)], 'grande.png', { type: 'image/png' });
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [big] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(component.photoPreview()).toBe('');
    expect(component.photoError()).toContain('512 KiB');
    expect(api.activateProfessional).not.toHaveBeenCalled();
  });

  it('rejects an empty selection and a reversed time range', () => {
    fixture.componentInstance.photoPreview.set(image);
    fixture.componentInstance.step.set(3);
    fixture.componentInstance.selectedDays.set([]);
    fixture.componentInstance.next();
    expect(api.activateProfessional).not.toHaveBeenCalled();
    fixture.componentInstance.selectedDays.set(['LUNES']);
    fixture.componentInstance.start.set('18:00');
    fixture.componentInstance.end.set('09:00');
    fixture.componentInstance.next();
    expect(api.activateProfessional).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage()).toContain('posterior');
  });
});

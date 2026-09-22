import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Account } from './account';
import { ApiService, UserAccount } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';

describe('Account (Mi cuenta)', () => {
  let fixture: ComponentFixture<Account>;
  let component: Account;
  let api: {
    getMyAccount: ReturnType<typeof vi.fn>;
    updateMyAccount: ReturnType<typeof vi.fn>;
    describeError: (error: unknown, fallback?: string) => string;
  };

  const account: UserAccount = {
    id: 'u-1',
    nombre: 'Sofia',
    apellido: 'Gomez',
    email: 'sofia@vincula-up.local',
    telefono: '3764 12-3456',
    fotoUrl: null,
    rolNegocio: 'CLIENTE',
    estado: 'ACTIVO',
  };

  beforeEach(async () => {
    api = {
      getMyAccount: vi.fn().mockReturnValue(of(account)),
      updateMyAccount: vi.fn((request: { nombre: string; apellido: string; telefono: string }) =>
        of({ ...account, ...request })),
      describeError: (_error: unknown, fallback = 'Error') => fallback,
    };

    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { refreshProfile: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra la información del usuario en tarjetas de solo lectura', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sofia');
    expect(text).toContain('sofia@vincula-up.local');
    expect(text).toContain('Datos personales');
    expect(text).toContain('Contacto');
    expect(text).toContain('Seguridad');
  });

  it('marca el email como no editable', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No editable');
    expect(fixture.nativeElement.querySelector('input[name=\"telefono\"]')).toBeNull();
  });

  it('edita los datos personales y envía solo el campo que cambió', () => {
    (fixture.nativeElement.querySelectorAll('button.link')[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    const nombre = fixture.nativeElement.querySelector('input[name=\"nombre\"]') as HTMLInputElement;
    nombre.value = 'Sofia Belen';
    nombre.dispatchEvent(new Event('input'));
    component.personalDraft.set({ nombre: 'Sofia Belen', apellido: 'Gomez' });
    (fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement).click();

    // El apellido no cambió: no se reenvía (el backend lo mantiene intacto).
    expect(api.updateMyAccount).toHaveBeenCalledWith({ nombre: 'Sofia Belen' });
    expect(component.editing()).toBeNull();
    expect(component.cardNotice()).toContain('actualizó');
  });

  it('envía nombre y apellido cuando ambos cambian', () => {
    component.startEdit('personal');
    component.personalDraft.set({ nombre: 'Sofia Belen', apellido: 'Gomez Lopez' });
    component.savePersonal();

    expect(api.updateMyAccount).toHaveBeenCalledTimes(1);
    expect(api.updateMyAccount.mock.calls[0][0]).toEqual({ nombre: 'Sofia Belen', apellido: 'Gomez Lopez' });
  });

  it('avisa cuando la tarjeta personal no tiene cambios para guardar', () => {
    component.startEdit('personal');
    component.personalDraft.set({ nombre: 'Sofia', apellido: 'Gomez' });
    component.savePersonal();

    expect(api.updateMyAccount).not.toHaveBeenCalled();
    expect(component.cardError()).toContain('No hay cambios');
  });

  it('guarda solo la foto sin reenviar el resto del perfil', () => {
    component.startEdit('photo');
    component.photoPreview.set('data:image/png;base64,abc');
    component.savePhoto();

    expect(api.updateMyAccount).toHaveBeenCalledTimes(1);
    expect(api.updateMyAccount.mock.calls[0][0]).toEqual({ fotoUrl: 'data:image/png;base64,abc' });
  });

  it('guarda solo el teléfono sin reenviar el resto del perfil', () => {
    component.startEdit('contact');
    component.contactDraft.set({ telefono: '3764 99-9999' });
    component.saveContact();

    expect(api.updateMyAccount).toHaveBeenCalledTimes(1);
    expect(api.updateMyAccount.mock.calls[0][0]).toEqual({ telefono: '3764 99-9999' });
  });

  it('nunca envía el email al guardar (lo ignora el backend)', () => {
    component.startEdit('contact');
    component.contactDraft.set({ telefono: '3764 99-9999' });
    component.saveContact();

    expect(api.updateMyAccount).toHaveBeenCalledTimes(1);
    expect(api.updateMyAccount.mock.calls[0][0]).not.toHaveProperty('email');
  });

  it('muestra el error del backend sin romper la tarjeta', () => {
    api.updateMyAccount.mockReturnValueOnce(throwError(() => ({ status: 409 })));
    component.startEdit('personal');
    component.personalDraft.set({ nombre: 'Sofia', apellido: 'Gomez' });
    component.savePersonal();

    expect(component.cardError()).toBeTruthy();
    expect(component.editing()).toBe('personal');
  });

  it('valida la foto antes de leerla (tipo y tamaño)', () => {
    const bad = new File(['x'], 'foto.gif', { type: 'image/gif' });
    component.onPhotoSelected({ target: { files: [bad] } } as unknown as Event);
    expect(component.photoError()).toContain('JPG o PNG');

    const big = new File([new Uint8Array(3 * 1024 * 1024)], 'foto.png', { type: 'image/png' });
    component.onPhotoSelected({ target: { files: [big] } } as unknown as Event);
    expect(component.photoError()).toContain('2 MB');
    expect(api.updateMyAccount).not.toHaveBeenCalled();
  });
});

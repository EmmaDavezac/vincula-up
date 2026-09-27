import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminProfessionals } from './admin-professionals';
import { ApiService } from '../../core/services/api.service';
import { routes } from '../../app.routes';

// Instancia real para usar el describeError real (método puro, sin dependencias).
const realApi = Object.create(ApiService.prototype) as ApiService;

describe('AdminProfessionals', () => {
  let fixture: ComponentFixture<AdminProfessionals>;

  const api = {
    getProfessionals: vi.fn(),
    getSpecialties: vi.fn(),
    getUsers: vi.fn(),
    createProfessionalInvite: vi.fn(),
    updateProfessional: vi.fn(),
    suspendProfessional: vi.fn(),
    reactivateProfessional: vi.fn(),
    describeError: vi.fn((error: unknown, fallback: string) => realApi.describeError(error, fallback)),
  };

  // CARGADO = el admin lo cargó y el profesional todavía no activó su perfil.
  const pendiente = {
    id: 'p1', usuarioId: 'u1', legajo: 'P-3001', estado: 'CARGADO',
    fotoUrl: 'data:image/png;base64,PADRON',
    especialidades: [{ id: 'e1', nombre: 'Electricidad' }],
  };
  const activo = {
    id: 'p2', usuarioId: 'u2', legajo: 'P-3002', estado: 'ACTIVO',
    especialidades: [{ id: 'e1', nombre: 'Electricidad' }],
  };
  const suspendido = {
    id: 'p3', usuarioId: 'u3', legajo: 'P-3003', estado: 'SUSPENDIDO',
    especialidades: [{ id: 'e2', nombre: 'Gasista matriculado' }],
  };

  // Cuentas: u1 todavía no se registró en Keycloak; u2 sí y tiene foto propia.
  const cuentaInvitado = {
    id: 'u1', nombre: 'Luciano', apellido: 'Benitez', email: 'luciano@vincula-up.local',
    telefono: '3442-555555', rolNegocio: 'PROFESIONAL', keycloakId: null, fotoUrl: null,
  };
  const cuentaRegistrada = {
    id: 'u2', nombre: 'Ana', apellido: 'Díaz', email: 'ana@vincula-up.local',
    telefono: '3442-111111', rolNegocio: 'PROFESIONAL', keycloakId: 'kc-2', fotoUrl: 'data:image/png;base64,CUENTA',
  };

  beforeEach(async () => {
    api.getProfessionals.mockReset().mockReturnValue(of([pendiente, activo, suspendido]));
    api.getSpecialties.mockReset().mockReturnValue(of([
      { id: 'e1', nombre: 'Electricidad' },
      { id: 'e2', nombre: 'Gasista matriculado' },
    ]));
    api.getUsers.mockReset().mockImplementation((rol?: string) =>
      of(rol === 'PROFESIONAL' ? [cuentaInvitado, cuentaRegistrada] : []));
    api.createProfessionalInvite.mockReset().mockReturnValue(of({ usuario: { id: 'nuevo' } }));
    api.updateProfessional.mockReset().mockReturnValue(of({ id: 'p2' }));
    api.suspendProfessional.mockReset().mockReturnValue(of({ id: 'p2', estado: 'SUSPENDIDO' }));
    api.reactivateProfessional.mockReset().mockReturnValue(of({ id: 'p3', estado: 'CARGADO' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [AdminProfessionals],
      providers: [provideHttpClient(), provideRouter(routes), { provide: ApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProfessionals);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el padrón con el contador, el email y las especialidades', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('3 profesionales registrados');
    expect(compiled.textContent).toContain('luciano@vincula-up.local');
    expect(compiled.textContent).toContain('Gasista matriculado');
    expect(compiled.textContent).toContain('PENDIENTE DE ACTIVACIÓN');
  });

  /**
   * La foto del padron se guarda como "" cuando el profesional no sube ninguna:
   * el panel debe mostrar la de la cuenta (la que la persona sí cargó).
   */
  it('muestra la foto de la cuenta y no la del padrón', () => {
    const component = fixture.componentInstance;
    expect(api.getUsers).toHaveBeenCalledWith('PROFESIONAL');
    expect(component.foto(activo)).toBe('data:image/png;base64,CUENTA');

    // Sin foto en la cuenta, se usa la del padrón como respaldo.
    api.getProfessionals.mockReturnValue(of([{ ...pendiente, fotoUrl: 'data:image/png;base64,PADRON' }]));
    const otro = TestBed.createComponent(AdminProfessionals);
    otro.detectChanges();
    expect(otro.componentInstance.foto(pendiente)).toBe('data:image/png;base64,PADRON');
  });

  it('marca la invitación pendiente cuando el profesional aún no se registró', () => {
    const component = fixture.componentInstance;
    expect(component.invitacionPendiente(pendiente)).toBe(true);
    expect(component.invitacionPendiente(activo)).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Invitación pendiente');
  });

  it('ofrece suspender a los que pueden operar y reactivar a los suspendidos', () => {
    const component = fixture.componentInstance;
    expect(component.puedeSuspenderse(activo)).toBe(true);
    expect(component.estaSuspendido(activo)).toBe(false);
    expect(component.puedeSuspenderse(suspendido)).toBe(false);
    expect(component.estaSuspendido(suspendido)).toBe(true);
  });

  it('registra un preregistro con los datos cargados por el administrador', () => {
    const component = fixture.componentInstance;
    component.form.nombre = 'Luciano';
    component.form.apellido = 'Benitez';
    component.form.email = 'luciano@vincula-up.local';
    component.form.telefono = '3442-555555';
    component.form.legajo = 'P-3003';
    component.form.especialidadIds = ['e1'];

    component.createProfessionalInvite();

    expect(api.createProfessionalInvite).toHaveBeenCalledWith({
      nombre: 'Luciano',
      apellido: 'Benitez',
      email: 'luciano@vincula-up.local',
      telefono: '3442-555555',
      legajo: 'P-3003',
      especialidadIds: ['e1'],
    });
    expect(component.formOpen()).toBe(false);
  });

  it('no registra el preregistro si faltan datos obligatorios', () => {
    const component = fixture.componentInstance;
    component.form.nombre = 'Luciano';
    component.form.email = 'luciano@vincula-up.local';

    component.createProfessionalInvite();

    expect(api.createProfessionalInvite).not.toHaveBeenCalled();
    expect(component.aviso().texto).toContain('Completá nombre, apellido y email');
  });

  it('abre el mismo detalle al consultar y al actualizar, con datos de la cuenta', () => {
    const component = fixture.componentInstance;

    component.abrirDetalle(activo, 'consulta');
    fixture.detectChanges();
    expect(component.modal()?.modo).toBe('consulta');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ana@vincula-up.local');
    expect(compiled.textContent).toContain('3442-111111');
    // En modo consulta no aparecen los campos de edición.
    expect(compiled.textContent).not.toContain('Guardar cambios');
    expect(compiled.textContent).toContain('Cerrar');

    component.abrirDetalle(activo, 'edicion');
    fixture.detectChanges();
    expect(component.modal()?.modo).toBe('edicion');
    expect(compiled.textContent).toContain('Guardar cambios');
  });

  it('actualiza legajo y especialidades desde el detalle, previa confirmación', () => {
    const component = fixture.componentInstance;
    component.abrirDetalle(activo, 'edicion');
    component.editForm.legajo = 'P-3002-B';
    component.editForm.especialidadIds = ['e1', 'e2'];

    component.guardarCambios();
    // Todavía no se guardó: el diálogo pide confirmación y resume qué cambia.
    expect(api.updateProfessional).not.toHaveBeenCalled();
    expect(component.confirmacion()?.detalle).toContain('P-3002-B');

    component.confirmarAccion();

    expect(api.updateProfessional).toHaveBeenCalledWith('p2', {
      usuarioId: 'u2', legajo: 'P-3002-B', especialidadIds: ['e1', 'e2'],
    });
    expect(component.modal()).toBeNull();
  });

  it('valida el legajo y las especialidades antes de actualizar', () => {
    const component = fixture.componentInstance;
    component.abrirDetalle(activo, 'edicion');
    component.editForm.legajo = '   ';
    component.guardarCambios();
    expect(api.updateProfessional).not.toHaveBeenCalled();
    expect(component.aviso().texto).toContain('legajo no puede quedar vacío');

    component.editForm.legajo = 'P-9';
    component.editForm.especialidadIds = [];
    component.guardarCambios();
    expect(api.updateProfessional).not.toHaveBeenCalled();
    expect(component.aviso().texto).toContain('al menos una especialidad');
  });

  it('suspende al profesional que puede operar', () => {
    const component = fixture.componentInstance;

    component.suspend(activo);
    expect(api.suspendProfessional).not.toHaveBeenCalled();
    component.confirmarAccion();

    expect(api.suspendProfessional).toHaveBeenCalledWith('p2');
    expect(component.professionals().find((item) => item.id === 'p2')?.estado).toBe('SUSPENDIDO');
    expect(component.aviso().texto).toContain('suspendido');
  });

  it('levanta la suspensión sin activar el perfil por su cuenta', () => {
    const component = fixture.componentInstance;
    // El backend devuelve CARGADO al levantar el baneo y la lista se recarga con ese estado.
    api.reactivateProfessional.mockReturnValueOnce(of({ id: 'p3', estado: 'CARGADO' }));
    api.getProfessionals.mockReturnValueOnce(of([pendiente, activo, { ...suspendido, estado: 'CARGADO' }]));

    component.reactivate(suspendido);
    component.confirmarAccion();

    expect(api.reactivateProfessional).toHaveBeenCalledWith('p3');
    expect(component.professionals().find((item) => item.id === 'p3')?.estado).toBe('CARGADO');
    expect(component.aviso().texto).toContain('suspensión');
  });

  it('el padrón sólo se da de baja lógicamente, sin eliminar el registro', () => {
    const component = fixture.componentInstance;
    expect('remove' in component).toBe(false);
    expect('deletingId' in component).toBe(false);
    // Tampoco queda un método de borrado físico en la API del frontend.
    expect('deleteProfessional' in api).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Eliminar del padrón');
    // La baja lógica es la suspensión, y sigue disponible.
    expect(compiled.textContent).toContain('Suspender');
    expect(compiled.textContent).toContain('Reactivar');
  });

  it('muestra el motivo del backend cuando la actualización falla', () => {
    const component = fixture.componentInstance;
    api.updateProfessional.mockReturnValueOnce(throwError(() => ({ status: 409, error: { message: 'El legajo ya existe' } })));
    component.abrirDetalle(activo, 'edicion');
    component.editForm.legajo = 'P-0000';

    component.guardarCambios();
    component.confirmarAccion();

    expect(component.aviso().texto).toContain('El legajo ya existe');
    expect(component.savingEdit()).toBe(false);
  });
});

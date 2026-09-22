import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Admin } from './admin';
import { ApiService } from '../core/services/api.service';

// Instancia real para usar el describeError real (método puro, sin dependencias).
const realApi = Object.create(ApiService.prototype) as ApiService;

describe('Admin', () => {
  let fixture: ComponentFixture<Admin>;

  const api = {
    getProfessionals: vi.fn(),
    getUsers: vi.fn(),
    getSpecialties: vi.fn(),
    getUserById: vi.fn(),
    createProfessionalInvite: vi.fn(),
    updateProfessional: vi.fn(),
    deleteProfessional: vi.fn(),
    suspendProfessional: vi.fn(),
    reactivateProfessional: vi.fn(),
    suspendUser: vi.fn(),
    reactivateUser: vi.fn(),
    saveSpecialty: vi.fn(),
    deleteSpecialty: vi.fn(),
    describeError: vi.fn((error: unknown, fallback: string) => realApi.describeError(error, fallback)),
  };

  const pendiente = {
    id: 'p1', usuarioId: 'u1', legajo: 'P-3001', estado: 'CARGADO',
    especialidades: [{ id: 'e1', nombre: 'Electricidad' }],
  };
  const activo = {
    id: 'p2', usuarioId: 'u2', legajo: 'P-3002', estado: 'ACTIVO',
    especialidades: [{ id: 'e1', nombre: 'Electricidad' }],
  };
  // u1 está invitado (sin cuenta Keycloak); u2 ya se registró.
  const profesionalInvitado = { id: 'u1', nombre: 'Luciano', apellido: 'Benitez', email: 'luciano@vincula-up.local', rolNegocio: 'PROFESIONAL', keycloakId: null };
  const profesionalRegistrado = { id: 'u2', nombre: 'Ana', apellido: 'Diaz', email: 'ana@vincula-up.local', rolNegocio: 'PROFESIONAL', keycloakId: 'kc-2', fotoUrl: 'data:image/png;base64,ansiok' };
  const clienteActivo = { id: 'c1', nombre: 'Sofia', apellido: 'Gomez', email: 'sofia@vincula-up.local', rolNegocio: 'CLIENTE', estado: 'ACTIVO' };
  const clienteBaneado = { id: 'c2', nombre: 'Mario', apellido: 'Perez', email: 'mario@vincula-up.local', rolNegocio: 'CLIENTE', estado: 'SUSPENDIDO' };
  const clienteConFoto = { id: 'c3', nombre: 'Carol', apellido: 'Ruiz', email: 'carol@vincula-up.local', rolNegocio: 'CLIENTE', estado: 'ACTIVO', fotoUrl: 'data:image/png;base64,iVBORw0KGgo=' };

  beforeEach(async () => {
    api.getProfessionals.mockReset().mockReturnValue(of([pendiente, activo]));
    api.getUsers.mockReset().mockImplementation((rol?: string) =>
      of(rol === 'CLIENTE' ? [clienteActivo, clienteBaneado, clienteConFoto] : [profesionalInvitado, profesionalRegistrado]));
    api.getSpecialties.mockReset().mockReturnValue(of([{ id: 'e1', nombre: 'Electricidad' }]));
    api.getUserById.mockReset().mockReturnValue(of({ telefono: '3442-9999', fotoUrl: 'data:image/png;base64,detailfoto' }));
    api.createProfessionalInvite.mockReset().mockReturnValue(of({ usuario: { id: 'nuevo' } }));
    api.updateProfessional.mockReset().mockReturnValue(of({ id: 'p2' }));
    api.deleteProfessional.mockReset().mockReturnValue(of(undefined));
    api.suspendProfessional.mockReset().mockReturnValue(of({ id: 'p1', estado: 'SUSPENDIDO' }));
    api.reactivateProfessional.mockReset().mockReturnValue(of({ id: 'p2', estado: 'CARGADO' }));
    api.suspendUser.mockReset().mockReturnValue(of({ id: 'c1', estado: 'SUSPENDIDO' }));
    api.reactivateUser.mockReset().mockReturnValue(of({ id: 'c2', estado: 'ACTIVO' }));
    api.saveSpecialty.mockReset().mockReturnValue(of({ id: 'e9', nombre: 'Gas' }));
    api.deleteSpecialty.mockReset().mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        provideHttpClient(),
        { provide: ApiService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function buttonsInRow(legajo: string): string[] {
    const rows = Array.from(fixture.nativeElement.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
    const row = rows.find((candidate) => candidate.textContent?.includes(legajo));
    return row ? Array.from(row.querySelectorAll('button')).map((button) => button.textContent?.trim() ?? '') : [];
  }

  it('renders the professional creation form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Alta individual de profesional');
  });

  it('renders the specialties catalog management section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Especialidades');
    expect(compiled.querySelector('.specialty-manage-list')?.textContent).toContain('Electricidad');
  });

  it('marks pending professionals without offering an admin activation action', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('PENDIENTE DE ACTIVACIÓN');
    const actions = buttonsInRow('P-3001').join(' ');
    expect(actions).not.toContain('Activar');
    expect(actions).toContain('Editar');
    expect(actions).toContain('Eliminar');
  });

  it('offers ban, edit and delete actions for active professionals', () => {
    const actions = buttonsInRow('P-3002').join(' ');
    expect(actions).toContain('Banear');
    expect(actions).toContain('Editar');
    expect(actions).toContain('Eliminar');
    expect(actions).not.toContain('Levantar baneo');
  });

  it('shows the professional photo when the padron has a dataURL foto', () => {
    const component = fixture.componentInstance;
    // u2 (Ana) tiene foto de data URL simulada
    const foto = component.professionalFoto(activo);
    expect(typeof foto).toBe('string');
  });

  it('registers a professional by email so they finish their own onboarding', () => {
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
  });

  it('marks professionals that still have not created their Keycloak account', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Invitación pendiente');
  });

  it('opens the more-info detail for a client and loads its photo and phone', () => {
    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;

    // Click "Más info" en el cliente con foto
    component.openDetail(clienteConFoto);
    expect(api.getUserById).toHaveBeenCalledWith('c3');
    expect(component.detailUser()).toBeTruthy();
    expect(component.detailUser()?.fotoUrl).toContain('data:image/png;base64,detailfoto');
    expect(component.detailUser()?.telefono).toBe('3442-9999');

    fixture.detectChanges();
    const infoButton = compiled.querySelector('.clients-panel button[mat-stroked-button]');
    expect(infoButton).toBeTruthy();
  });

  it('renders the detail card with photo and phone and closes it again', () => {
    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;

    component.openDetail(clienteConFoto);
    fixture.detectChanges();

    const card = compiled.querySelector('.detail-card');
    expect(card?.textContent).toContain('Carol');
    expect(card?.textContent).toContain('3442-9999');
    expect(card?.querySelector('img')?.getAttribute('src')).toContain('data:image/png;base64,detailfoto');

    component.closeDetail();
    fixture.detectChanges();
    expect(compiled.querySelector('.detail-card')).toBeNull();
  });

  it('renders the clients section with photos, more-info and ban/unban actions', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Clientes');

    const rows = Array.from(compiled.querySelectorAll('.clients-panel tbody tr')) as HTMLElement[];
    const mario = rows.find((row) => row.textContent?.includes('mario@vincula-up.local'));
    expect(mario?.textContent).toContain('Levantar baneo');
    expect(mario?.textContent).toContain('Más info');

    const sofia = rows.find((row) => row.textContent?.includes('sofia@vincula-up.local'));
    expect(sofia?.textContent).toContain('Banear');

    const carol = rows.find((row) => row.textContent?.includes('carol@vincula-up.local'));
    expect(carol?.textContent).toContain('Carol');
    expect(carol?.querySelector('img[loading="lazy"]')).toBeTruthy();
  });

  it('bans and unbans clients by norm violation', () => {
    const component = fixture.componentInstance;

    api.suspendUser.mockReturnValue(of({ id: 'c1', estado: 'SUSPENDIDO' }));

    component.banClient(clienteActivo);
    expect(api.suspendUser).toHaveBeenCalledWith('c1');
    expect(component.clientBusyId()).toBe(null);
    expect(component.clients().find((item) => item.id === 'c1')?.estado).toBe('SUSPENDIDO');

    api.reactivateUser.mockReturnValue(of({ id: 'c2', estado: 'ACTIVO' }));

    component.unbanClient(clienteBaneado);
    expect(api.reactivateUser).toHaveBeenCalledWith('c2');
    expect(component.clientBusyId()).toBe(null);
    expect(component.clients().find((item) => item.id === 'c2')?.estado).toBe('ACTIVO');
  });

  it('edits the legajo and specialties of a professional', () => {
    const component = fixture.componentInstance;
    component.startEdit(activo);
    expect(component.editingId()).toBe('p2');
    component.editForm.legajo = 'P-3002-B';
    component.editForm.especialidadIds = ['e1'];

    component.saveEdit(activo);

    expect(api.updateProfessional).toHaveBeenCalledWith('p2', {
      usuarioId: 'u2', legajo: 'P-3002-B', especialidadIds: ['e1'],
    });
  });

  it('deletes a professional only after confirmation', () => {
    const component = fixture.componentInstance;

    component.remove(activo);
    expect(api.deleteProfessional).toHaveBeenCalledWith('p2');

    api.deleteProfessional.mockClear();
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    component.remove(activo);
    expect(api.deleteProfessional).not.toHaveBeenCalled();
  });

    it('bans and lifts the ban without ever activating the profile itself', () => {
    const component = fixture.componentInstance;

    // El backend devuelve el estado suspendido; el componente solo refresca estado.
    api.suspendProfessional.mockReturnValueOnce(of({ id: 'p1', estado: 'SUSPENDIDO' }));

    component.suspend(pendiente);
    expect(api.suspendProfessional).toHaveBeenCalledWith('p1');
    expect(component.professionals().find((item) => item.id === 'p1')?.estado).toBe('SUSPENDIDO');

    // El backend devuelve CARGADO: el baneo no activa perfiles.
    api.reactivateProfessional.mockReturnValueOnce(of({ id: 'p1', estado: 'CARGADO' }));

    component.reactivate(pendiente);
    expect(api.reactivateProfessional).toHaveBeenCalledWith('p1');
    expect(component.professionals().find((item) => item.id === 'p1')?.estado).toBe('CARGADO');
  });

  it('creates, renames and deletes specialties through the existing endpoints', () => {
    const component = fixture.componentInstance;
    const specialty = { id: 'e1', nombre: 'Electricidad' };

    component.nuevaEspecialidad = 'Gasista matriculado';
    component.createSpecialty();
    expect(api.saveSpecialty).toHaveBeenCalledWith(null, 'Gasista matriculado');

    component.startRename(specialty);
    component.renameValue = 'Electricidad industrial';
    component.saveRename(specialty);
    expect(api.saveSpecialty).toHaveBeenCalledWith('e1', 'Electricidad industrial');

    component.deleteSpecialty(specialty);
    expect(api.deleteSpecialty).toHaveBeenCalledWith('e1');
  });

  it('shows the backend reason when a specialty cannot be deleted', () => {
    const component = fixture.componentInstance;
    api.deleteSpecialty.mockReturnValueOnce(throwError(() => ({
      status: 409,
      error: { message: 'La especialidad está asignada a profesionales' },
    })));

    component.deleteSpecialty({ id: 'e1', nombre: 'Electricidad' });

    expect(component.message()).toContain('asignada a profesionales');
  });
});

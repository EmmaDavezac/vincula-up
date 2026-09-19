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
    createProfessional: vi.fn(),
    updateProfessional: vi.fn(),
    deleteProfessional: vi.fn(),
    suspendProfessional: vi.fn(),
    reactivateProfessional: vi.fn(),
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

  beforeEach(async () => {
    api.getProfessionals.mockReset().mockReturnValue(of([pendiente, activo]));
    api.getUsers.mockReset().mockReturnValue(of([]));
    api.getSpecialties.mockReset().mockReturnValue(of([{ id: 'e1', nombre: 'Electricidad' }]));
    api.createProfessional.mockReset().mockReturnValue(of({ id: 'nuevo' }));
    api.updateProfessional.mockReset().mockReturnValue(of({ id: 'p2' }));
    api.deleteProfessional.mockReset().mockReturnValue(of(undefined));
    api.suspendProfessional.mockReset().mockReturnValue(of({ id: 'p1', estado: 'SUSPENDIDO' }));
    api.reactivateProfessional.mockReset().mockReturnValue(of({ id: 'p2', estado: 'CARGADO' }));
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

  it('creates a professional that stays pending of activation', () => {
    const component = fixture.componentInstance;
    component.form.usuarioId = 'u3';
    component.form.legajo = 'P-3003';
    component.form.especialidadIds = ['e1'];

    component.createProfessional();

    expect(api.createProfessional).toHaveBeenCalledWith({
      usuarioId: 'u3', legajo: 'P-3003', especialidadIds: ['e1'],
    });
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

    component.suspend(pendiente);
    expect(api.suspendProfessional).toHaveBeenCalledWith('p1');
    expect(component.professionals().find((item) => item.id === 'p1')?.estado).toBe('SUSPENDIDO');

    component.reactivate(pendiente);
    expect(api.reactivateProfessional).toHaveBeenCalledWith('p1');
    // El backend devuelve CARGADO: el baneo no activa perfiles.
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

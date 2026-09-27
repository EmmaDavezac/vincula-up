import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminCategories } from './admin-categories';
import { ApiService } from '../../core/services/api.service';
import { routes } from '../../app.routes';

// Instancia real para usar el describeError real (método puro, sin dependencias).
const realApi = Object.create(ApiService.prototype) as ApiService;

describe('AdminCategories', () => {
  let fixture: ComponentFixture<AdminCategories>;

  const api = {
    getSpecialties: vi.fn(),
    saveSpecialty: vi.fn(),
    deleteSpecialty: vi.fn(),
    describeError: vi.fn((error: unknown, fallback: string) => realApi.describeError(error, fallback)),
  };

  const electricidad = { id: 'e1', nombre: 'Electricidad' };
  const gas = { id: 'e2', nombre: 'Gasista matriculado' };

  beforeEach(async () => {
    api.getSpecialties.mockReset().mockReturnValue(of([electricidad, gas]));
    api.saveSpecialty.mockReset().mockReturnValue(of({ id: 'e9', nombre: 'Climatización' }));
    api.deleteSpecialty.mockReset().mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [AdminCategories],
      providers: [provideHttpClient(), provideRouter(routes), { provide: ApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCategories);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista el catálogo con el conteo de categorías', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2 categorías');
    expect(compiled.textContent).toContain('Gasista matriculado');
  });

  it('crea una categoría nueva', () => {
    const component = fixture.componentInstance;
    component.nuevaCategoria = 'Climatización';

    component.createCategory();

    expect(api.saveSpecialty).toHaveBeenCalledWith(null, 'Climatización');
    expect(component.nuevaCategoria).toBe('');
  });

  it('no crea categorías duplicadas ni vacías', () => {
    const component = fixture.componentInstance;

    component.nuevaCategoria = 'electricidad';
    component.createCategory();
    expect(api.saveSpecialty).not.toHaveBeenCalled();
    expect(component.aviso().texto).toContain('ya existe');

    component.nuevaCategoria = '   ';
    component.createCategory();
    expect(api.saveSpecialty).not.toHaveBeenCalled();
  });

  it('renombra una categoría existente, previa confirmación', () => {
    const component = fixture.componentInstance;
    component.startRename(electricidad);
    component.renameValue = 'Electricidad industrial';

    component.saveRename(electricidad);
    expect(api.saveSpecialty).not.toHaveBeenCalled();

    component.confirmarAccion();
    expect(api.saveSpecialty).toHaveBeenCalledWith('e1', 'Electricidad industrial');
    expect(component.renamingId()).toBe(null);
  });

  it('elimina una categoría sólo con confirmación', () => {
    const component = fixture.componentInstance;

    // Con el diálogo abierto todavía no se borra nada.
    component.deleteCategory(gas);
    expect(api.deleteSpecialty).not.toHaveBeenCalled();
    expect(component.confirmacion()?.peligro).toBe(true);

    component.confirmarAccion();
    expect(api.deleteSpecialty).toHaveBeenCalledWith('e2');
  });

  it('cancelar el diálogo no ejecuta la acción', () => {
    const component = fixture.componentInstance;

    component.deleteCategory(gas);
    component.cancelarAccion();

    expect(api.deleteSpecialty).not.toHaveBeenCalled();
    expect(component.confirmacion()).toBe(null);
  });

  it('muestra el motivo del backend cuando la categoría está asignada', () => {
    const component = fixture.componentInstance;
    api.deleteSpecialty.mockReturnValueOnce(throwError(() => ({
      status: 409,
      error: { message: 'La especialidad está asignada a profesionales' },
    })));

    component.deleteCategory(electricidad);
    component.confirmarAccion();

    expect(component.aviso().texto).toContain('asignada a profesionales');
    expect(component.busy()).toBe(false);
  });
});

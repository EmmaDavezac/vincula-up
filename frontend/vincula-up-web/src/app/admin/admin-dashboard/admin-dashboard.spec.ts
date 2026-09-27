import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminDashboard } from './admin-dashboard';
import { ApiService } from '../../core/services/api.service';
import { routes } from '../../app.routes';

// Instancia real para usar el describeError real (método puro, sin dependencias).
const realApi = Object.create(ApiService.prototype) as ApiService;

describe('AdminDashboard', () => {
  let fixture: ComponentFixture<AdminDashboard>;

  const hoy = new Date();
  const delMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 5, 10, 0).toISOString();
  const delMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 5, 10, 0).toISOString();

  const api = {
    getAdminRequests: vi.fn(),
    getSpecialtiesMap: vi.fn(),
    getProfessionals: vi.fn(),
    getUsers: vi.fn(),
    describeError: vi.fn((error: unknown, fallback: string) => realApi.describeError(error, fallback)),
  };

  const solicitud = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    clienteId: 'c1',
    profesionalId: 'p1',
    especialidadId: 'e1',
    estado: 'COMPLETADA',
    puntaje: 5,
    fechaCreacion: delMesActual,
    fechaHoraPropuesta: delMesActual,
    ...over,
  });

  beforeEach(async () => {
    api.getAdminRequests.mockReset().mockReturnValue(of([
      solicitud(),
      solicitud({ id: 's2', especialidadId: 'e2', estado: 'ACEPTADA', puntaje: null, fechaCreacion: delMesActual }),
      solicitud({ id: 's3', especialidadId: 'e1', estado: 'PENDIENTE', puntaje: null, fechaCreacion: delMesAnterior }),
    ]));
    api.getSpecialtiesMap.mockReset().mockReturnValue(of({ e1: 'Electricidad', e2: 'Gasista matriculado' }));
    api.getProfessionals.mockReset().mockReturnValue(of([
      { id: 'p1', estado: 'ACTIVO' },
      { id: 'p2', estado: 'CARGADO' },
      { id: 'p3', estado: 'SUSPENDIDO' },
    ]));
    api.getUsers.mockReset().mockReturnValue(of([{ id: 'c1' }, { id: 'c2' }]));

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [provideHttpClient(), provideRouter(routes), { provide: ApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el dashboard con los indicadores del prototipo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dashboard de administración');
    expect(compiled.textContent).toContain('Solicitudes este mes');
    expect(compiled.textContent).toContain('Tasa de concreción');
  });

  it('cuenta profesionales activos y clientes registrados sobre datos reales', () => {
    const component = fixture.componentInstance;
    const metricas = component.metricas();

    expect(api.getProfessionals).toHaveBeenCalledWith(undefined, true);
    expect(api.getUsers).toHaveBeenCalledWith('CLIENTE');
    expect(metricas.find((item) => item.label === 'Profesionales activos')?.value).toBe('1');
    expect(metricas.find((item) => item.label === 'Clientes registrados')?.value).toBe('2');
  });

  it('calcula la tasa de concreción y la satisfacción con las calificaciones', () => {
    const metricas = fixture.componentInstance.metricas();
    // 1 de 3 solicitudes completadas y una sola valoración (5 puntos).
    expect(metricas.find((item) => item.label === 'Tasa de concreción')?.value).toBe('33%');
    expect(metricas.find((item) => item.label === 'Satisfacción promedio')?.value).toBe('5.0 / 5');
  });

  it('ordena la demanda por especialidad usando el nombre del catálogo', () => {
    const demanda = fixture.componentInstance.demandaPorEspecialidad();
    expect(demanda[0].nombre).toBe('Electricidad');
    expect(demanda[0].solicitudes).toBe(2);
    expect(demanda[0].porcentaje).toBe(100);
    expect(demanda[0].nivel).toBe('Alta');
    expect(demanda[1].nombre).toBe('Gasista matriculado');
    expect(demanda[1].porcentaje).toBe(50);
  });

  it('arma el embudo del pedido al impacto', () => {
    const embudo = fixture.componentInstance.embudo();
    expect(embudo.map((etapa) => etapa.value)).toEqual([3, 2, 1, 1]);
    expect(embudo[0].label).toBe('Solicitudes recibidas');
  });

  it('avisa cuando no se pueden cargar las solicitudes y sigue mostrando el panel', () => {
    api.getAdminRequests.mockReturnValueOnce(throwError(() => ({ status: 403, error: { message: 'Rol no autorizado' } })));
    const otro = TestBed.createComponent(AdminDashboard);
    otro.detectChanges();

    expect(otro.componentInstance.aviso().texto).toContain('permiso');
    expect(otro.componentInstance.demandaPorEspecialidad()).toEqual([]);
    expect(otro.componentInstance.embudo()[0].value).toBe(0);
  });
});

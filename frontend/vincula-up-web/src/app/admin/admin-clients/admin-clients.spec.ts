import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminClients } from './admin-clients';
import { ApiService } from '../../core/services/api.service';
import { routes } from '../../app.routes';

// Instancia real para usar el describeError real (método puro, sin dependencias).
const realApi = Object.create(ApiService.prototype) as ApiService;

describe('AdminClients', () => {
  let fixture: ComponentFixture<AdminClients>;

  const api = {
    getUsers: vi.fn(),
    getAdminRequests: vi.fn(),
    suspendUser: vi.fn(),
    reactivateUser: vi.fn(),
    describeError: vi.fn((error: unknown, fallback: string) => realApi.describeError(error, fallback)),
  };

  const conFoto = {
    id: 'c1', nombre: 'Sofía', apellido: 'Martínez', email: 'sofia@vincula-up.local',
    rolNegocio: 'CLIENTE', estado: 'ACTIVO', fotoUrl: 'data:image/png;base64,iVBORw0KGgo=',
  };
  const baneado = {
    id: 'c2', nombre: 'Ana', apellido: 'López', email: 'ana@vincula-up.local',
    rolNegocio: 'CLIENTE', estado: 'SUSPENDIDO',
  };

  const solicitud = (clienteId: string) => ({
    id: `s-${clienteId}`, clienteId, profesionalId: 'p1', especialidadId: 'e1',
    estado: 'COMPLETADA', puntaje: 5, fechaCreacion: '2026-09-01T10:00:00',
  });

  beforeEach(async () => {
    api.getUsers.mockReset().mockReturnValue(of([conFoto, baneado]));
    api.getAdminRequests.mockReset().mockReturnValue(of([
      solicitud('c1'), solicitud('c1'), solicitud('c1'), solicitud('c2'),
    ]));
    api.suspendUser.mockReset().mockReturnValue(of({ id: 'c1', estado: 'SUSPENDIDO' }));
    api.reactivateUser.mockReset().mockReturnValue(of({ id: 'c2', estado: 'ACTIVO' }));

    await TestBed.configureTestingModule({
      imports: [AdminClients],
      providers: [provideHttpClient(), provideRouter(routes), { provide: ApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminClients);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista los clientes con su actividad real', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2 clientes');
    expect(compiled.textContent).toContain('3');
    expect(compiled.textContent).toContain('solicitudes realizadas');
  });

  it('ordena por actividad: primero el cliente con más solicitudes', () => {
    const ordenados = fixture.componentInstance.clientesOrdenados();
    expect(ordenados[0].client.id).toBe('c1');
    expect(ordenados[0].solicitudes).toBe(3);
    expect(ordenados[1].solicitudes).toBe(1);
  });

  it('suspende la cuenta del cliente activo', () => {
    const component = fixture.componentInstance;
    component.toggleAccess(conFoto);
    expect(api.suspendUser).not.toHaveBeenCalled();
    component.confirmarAccion();

    expect(api.suspendUser).toHaveBeenCalledWith('c1');
    expect(component.clients().find((item) => item.id === 'c1')?.estado).toBe('SUSPENDIDO');
    expect(component.aviso().texto).toContain('desactivado');
  });

  it('reactiva la cuenta del cliente suspendido', () => {
    const component = fixture.componentInstance;
    component.toggleAccess(baneado);
    component.confirmarAccion();

    expect(api.reactivateUser).toHaveBeenCalledWith('c2');
    expect(component.clients().find((item) => item.id === 'c2')?.estado).toBe('ACTIVO');
    expect(component.aviso().texto).toContain('reactivada');
  });

  it('mantiene el estado cuando el backend rechaza la operación', () => {
    const component = fixture.componentInstance;
    api.suspendUser.mockReturnValueOnce(throwError(() => ({ status: 403, error: { message: 'Rol no autorizado' } })));

    component.toggleAccess(conFoto);
    component.confirmarAccion();

    expect(component.clients().find((item) => item.id === 'c1')?.estado).toBe('ACTIVO');
    expect(component.busyId()).toBe(null);
    expect(component.aviso().texto).toContain('permiso');
  });

  it('avisa si no se pudo cargar la lista de clientes', () => {
    api.getUsers.mockReturnValueOnce(throwError(() => ({ status: 500, error: { message: 'Fallo del servicio' } })));
    const otro = TestBed.createComponent(AdminClients);
    otro.detectChanges();

    expect(otro.componentInstance.aviso().texto).toContain('Fallo del servicio');
    expect(otro.componentInstance.clients()).toEqual([]);
  });
});

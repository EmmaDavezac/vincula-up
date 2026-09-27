import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { MyRequests } from './my-requests';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { emptyServiceRequest } from '../core/models/service-request';

const specialtyId = '33333333-3333-3333-3333-333333333333';

describe('Received request specialties', () => {
  const api = { getMyRequests: vi.fn(), getSpecialtiesMap: vi.fn() };
  beforeEach(() => {
    api.getMyRequests.mockReturnValue(of([emptyServiceRequest({
      id: 'request-1', especialidadId: specialtyId, specialty: specialtyId,
    })]));
    api.getSpecialtiesMap.mockReturnValue(of({ [specialtyId]: 'Electricidad domiciliaria' }));
    TestBed.configureTestingModule({
      imports: [MyRequests], providers: [provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: {
          currentUser: () => ({ id: 'professional-user' }), getKeycloakId: () => 'professional-user',
          hasRole: (role: string) => role === 'PROFESIONAL',
        } },
      ],
    });
  });

  it('renders the specialty name in the received request card instead of the code', () => {
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.req-card__sub').textContent).toBe('Electricidad domiciliaria');
  });

  it('updates from loading to the name when the catalog arrives later', () => {
    const catalog = new Subject<Record<string, string>>();
    api.getSpecialtiesMap.mockReturnValue(catalog);
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.req-card__sub').textContent).toBe('Cargando especialidad...');
    catalog.next({ [specialtyId]: 'Electricidad domiciliaria' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.req-card__sub').textContent).toBe('Electricidad domiciliaria');
  });

  it('shows a recoverable error without exposing the code on catalog failure', () => {
    api.getSpecialtiesMap.mockReturnValue(throwError(() => new Error('Unavailable')));
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.req-card__sub').textContent).toBe('Especialidad no disponible');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});

describe('Request filters', () => {
  const specialtyA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const specialtyB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const api = { getMyRequests: vi.fn(), getSpecialtiesMap: vi.fn() };
  beforeEach(() => {
    api.getMyRequests.mockReturnValue(of([
      emptyServiceRequest({
        id: 1, status: 'PENDIENTE', especialidadId: specialtyA, specialty: specialtyA,
        professionalName: 'Ana Fontanera', address: 'Calle Uno 1',
        description: 'Se corta la luz en la cocina y no vuelve.',
        date: '2026-09-01', time: '10:00', fechaCreacion: '2026-09-01T10:00:00',
      }),
      emptyServiceRequest({
        id: 2, status: 'ACEPTADA', especialidadId: specialtyB, specialty: specialtyB,
        professionalName: 'Bruno Electricista', address: 'Calle Dos 2',
        date: '2026-09-02', time: '11:00', fechaCreacion: '2026-09-02T10:00:00',
      }),
      emptyServiceRequest({
        id: 3, status: 'COMPLETADA', especialidadId: specialtyA, specialty: specialtyA,
        professionalName: 'Carla Gasista', address: 'Calle Tres 3',
        date: '2026-08-30', time: '09:00', fechaCreacion: '2026-08-30T10:00:00',
      }),
    ]));
    api.getSpecialtiesMap.mockReturnValue(of({ [specialtyA]: 'Plomería', [specialtyB]: 'Electricidad' }));
    TestBed.configureTestingModule({
      imports: [MyRequests], providers: [provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: {
          currentUser: () => ({ id: 'client-user' }), getKeycloakId: () => 'client-user',
          hasRole: (role: string) => role === 'CLIENTE',
        } },
      ],
    });
  });

  const ids = (cmp: MyRequests) => cmp.filteredRequests().map((r) => r.id);

  it('shows every request by default in the order they arrive', () => {
    const fixture = TestBed.createComponent(MyRequests);
    const cmp = fixture.componentInstance as MyRequests;
    // Sin selector de orden la lista conserva el orden en que llegan las solicitudes.
    expect(ids(cmp)).toEqual([1, 2, 3]);
  });

  it('filters by status', () => {
    const fixture = TestBed.createComponent(MyRequests);
    const cmp = fixture.componentInstance as MyRequests;
    cmp.statusFilter.set('ACEPTADA');
    expect(ids(cmp)).toEqual([2]);
  });

  it('filtra por especialidad', () => {
    const fixture = TestBed.createComponent(MyRequests);
    const cmp = fixture.componentInstance as MyRequests;
    expect(cmp.specialtyOptions().map((o) => o.label)).toEqual(['Electricidad', 'Plomería']);
    cmp.specialtyFilter.set(specialtyB);
    expect(ids(cmp)).toEqual([2]);
    cmp.clearFilters();
    expect(ids(cmp)).toEqual([1, 2, 3]);
  });

  it('no ofrece búsqueda ni ordenamiento: sólo filtros de estado y especialidad', () => {
    const fixture = TestBed.createComponent(MyRequests);
    const cmp = fixture.componentInstance as MyRequests;
    expect('searchTerm' in cmp).toBe(false);
    expect('sortOrder' in cmp).toBe(false);
    expect('sortOptions' in cmp).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Ordenar');
    expect(compiled.querySelector('input[type="text"]')).toBeNull();
  });

  it('muestra el horario como rango, no como una hora puntual', () => {
    const fixture = TestBed.createComponent(MyRequests);
    const cmp = fixture.componentInstance as MyRequests;
    const conRango = emptyServiceRequest({ id: 9, time: '08:00', timeEnd: '12:00' });
    const sinFin = emptyServiceRequest({ id: 10, time: '16:00', timeEnd: '' });

    expect(cmp.horarioLabel(conRango)).toBe('08:00 a 12:00 hs');
    // Las solicitudes anteriores a guardar el fin se reconstruyen con las franjas.
    expect(cmp.horarioLabel(sinFin)).toBe('16:00 a 20:00 hs');
    // Si no se reconoce la franja, se muestra el inicio tal cual.
    expect(cmp.horarioLabel(emptyServiceRequest({ time: '09:30' }))).toBe('09:30');
  });

  it('no repite el estado ya mostrado en la etiqueta', () => {
    const fixture = TestBed.createComponent(MyRequests);
    const cmp = fixture.componentInstance as MyRequests;
    expect(cmp.nextAction('ACEPTADA')).toBe('');
    expect(cmp.nextAction('ACEPTADA')).not.toContain('confirmado');
  });

  it('muestra el resumen del problema que escribió el cliente', () => {
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Se corta la luz en la cocina');
    expect(compiled.textContent).toContain('Tu resumen');
  });

});

describe('Request location map', () => {
  const api = { getMyRequests: vi.fn(), getSpecialtiesMap: vi.fn() };
  beforeEach(() => {
    api.getMyRequests.mockReturnValue(of([
      emptyServiceRequest({ id: 10, latitude: -31.41, longitude: -64.49, address: 'Calle Falsa 123' }),
      emptyServiceRequest({ id: 11, latitude: null, longitude: null, address: 'Sin coords 456' }),
    ]));
    api.getSpecialtiesMap.mockReturnValue(of({}));
    TestBed.configureTestingModule({
      imports: [MyRequests], providers: [provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: {
          currentUser: () => ({ id: 'professional-user' }), getKeycloakId: () => 'professional-user',
          hasRole: (role: string) => role === 'PROFESIONAL',
        } },
      ],
    });
  });

  it('shows the address and an embedded map, without raw coordinates or external links', () => {
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const visibleText = [...root.querySelectorAll('.req-card__address, .req-card__map .vu-map-label')]
      .map((el) => el.textContent ?? '')
      .join(' ');
    expect(visibleText).toContain('Calle Falsa 123');
    expect(visibleText).not.toContain('-31.41');
    expect(visibleText).not.toContain('-64.49');
    expect(visibleText).not.toMatch(/-?\d{1,3}\.\d{3,}/);
    const frame: HTMLIFrameElement | null = fixture.nativeElement.querySelector('iframe.embedded-map');
    expect(frame).not.toBeNull();
    expect(frame?.src ?? '').toContain('openstreetmap.org/export/embed.html');
    // Todo el mapa se ve embebido: no se sale a un servicio externo.
    expect(fixture.nativeElement.querySelector('.req-card__links a')).toBeNull();
  });

  it('returns no embedded map when there are no coordinates', () => {
    const fixture = TestBed.createComponent(MyRequests);
    const cmp = fixture.componentInstance as MyRequests;
    const withCoords = cmp.requests().find((r) => r.id === 10)!;
    expect(String(cmp.embeddedMapUrl(withCoords))).toContain('openstreetmap.org/export/embed.html');
    expect(cmp.embeddedMapUrl(cmp.requests().find((r) => r.id === 11)!)).toBeNull();
  });
});

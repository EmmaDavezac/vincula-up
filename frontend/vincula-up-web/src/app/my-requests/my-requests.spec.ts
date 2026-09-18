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
    expect(fixture.nativeElement.querySelector('.request-card h2').textContent).toBe('Electricidad domiciliaria');
  });

  it('updates from loading to the name when the catalog arrives later', () => {
    const catalog = new Subject<Record<string, string>>();
    api.getSpecialtiesMap.mockReturnValue(catalog);
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.request-card h2').textContent).toBe('Cargando especialidad...');
    catalog.next({ [specialtyId]: 'Electricidad domiciliaria' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.request-card h2').textContent).toBe('Electricidad domiciliaria');
  });

  it('shows a recoverable error without exposing the code on catalog failure', () => {
    api.getSpecialtiesMap.mockReturnValue(throwError(() => new Error('Unavailable')));
    const fixture = TestBed.createComponent(MyRequests);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.request-card h2').textContent).toBe('Especialidad no disponible');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});

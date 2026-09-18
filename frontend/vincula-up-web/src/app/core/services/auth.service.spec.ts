import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService professional status', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      const values = new Map<string, string>();
      vi.stubGlobal(name, {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, String(value)),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() { return values.size; },
      });
    }
    localStorage.clear();
    sessionStorage.clear();
    const payload = btoa(JSON.stringify({ sub: 'identity', role: 'PROFESIONAL', exp: 9999999999 }));
    localStorage.setItem('vincula-up-token', `header.${payload}.signature`);
    localStorage.setItem('vincula-up-profile', JSON.stringify({ id: 'user', name: 'Profesional', role: 'PROFESIONAL' }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    http.expectOne((req) => req.url.endsWith('/profesionales/mi-perfil')).flush({ estado: 'ACTIVO' });
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it.each(['CARGADO', 'SUSPENDIDO', 'ACTIVO'])('uses the backend estado=%s instead of cached activation', async (estado) => {
    const result = firstValueFrom(auth.loadProfessionalStatus());
    const request = http.expectOne((req) => req.url === `${environment.apiUrl}/profesionales/mi-perfil`);
    expect(request.request.params.get('usuarioId')).toBe('user');
    expect(request.request.params.get('keycloakId')).toBe('identity');
    request.flush({ id: 'professional', usuarioId: 'user', estado });
    expect(await result).toBe(estado === 'ACTIVO');
    expect(auth.isProfessionalActive()).toBe(estado === 'ACTIVO');
  });

  it('treats 204 without a profile as inactive', async () => {
    const result = firstValueFrom(auth.loadProfessionalStatus());
    http.expectOne((req) => req.url.endsWith('/mi-perfil')).flush(null, { status: 204, statusText: 'No Content' });
    expect(await result).toBe(false);
    expect(auth.isProfessionalActive()).toBe(false);
  });

  it('does not grant access when the status lookup fails', async () => {
    const result = firstValueFrom(auth.loadProfessionalStatus());
    http.expectOne((req) => req.url.endsWith('/mi-perfil')).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(await result).toBe(false);
    expect(auth.isProfessionalActive()).toBe(false);
  });
});

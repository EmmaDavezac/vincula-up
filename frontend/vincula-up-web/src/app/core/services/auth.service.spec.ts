import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user-profile';
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
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    // Al restaurar la sesión el servicio pide la foto de la cuenta.
    http.expectOne((req) => req.url.endsWith('/usuarios/yo')).flush({ fotoUrl: null });
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

describe('AuthService own photo', () => {
  let http: HttpTestingController;

  const sembrarSesion = (role: UserRole = 'ADMIN', nombre = 'Lucía') => {
    const payload = btoa(JSON.stringify({ sub: 'identity', role, exp: 9999999999 }));
    localStorage.setItem('vincula-up-token', `header.${payload}.signature`);
    localStorage.setItem('vincula-up-profile', JSON.stringify({ id: 'user', name: nombre, role }));
  };

  /** Crea el servicio en el estado actual del almacenamiento. */
  const crearAuth = () => TestBed.runInInjectionContext(() => new AuthService());
  const fotoRequest = () => http.expectOne((req) => req.url.endsWith('/usuarios/yo'));

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
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('pide la foto apenas se restaura la sesión, sin esperar a la navbar', () => {
    sembrarSesion();

    const auth = crearAuth();

    // La petición sale sola al construir el servicio con la sesión ya disponible.
    const request = fotoRequest();
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'user', nombre: 'Lucía', apellido: 'Benítez', fotoUrl: 'data:image/png;base64,FOTO' });

    expect(auth.currentUser()?.fotoUrl).toBe('data:image/png;base64,FOTO');
  });

  it('reintenta la foto cuando la sesión aparece después (login por callback)', () => {
    // Caso real: la navbar se montó sin token y recién después se completa el login.
    const auth = crearAuth();
    expect(auth.currentUser()).toBeNull();
    http.expectNone((req) => req.url.endsWith('/usuarios/yo'));

    sembrarSesion('CLIENTE', 'Sofía');
    auth.refreshSession();
    // El effect del servicio reacciona a la sesión nueva.
    TestBed.tick();

    fotoRequest().flush({ fotoUrl: 'data:image/png;base64,SOFIA' });
    expect(auth.currentUser()?.fotoUrl).toBe('data:image/png;base64,SOFIA');
  });

  it('pide la foto una sola vez por sesión', () => {
    sembrarSesion();
    const auth = crearAuth();
    fotoRequest().flush({ fotoUrl: 'data:image/png;base64,FOTO' });

    auth.loadOwnPhoto();
    auth.loadOwnPhoto();

    http.expectNone((req) => req.url.endsWith('/usuarios/yo'));
  });

  it('deja el avatar en iniciales si la foto no se puede consultar', () => {
    sembrarSesion();
    const auth = crearAuth();

    fotoRequest().flush({}, { status: 500, statusText: 'Error' });

    expect(auth.currentUser()).not.toBeNull();
    expect(auth.currentUser()?.fotoUrl).toBeUndefined();
  });

  it('no pide nada sin sesión', () => {
    const anonimo = crearAuth();

    anonimo.loadOwnPhoto();

    http.expectNone((req) => req.url.endsWith('/usuarios/yo'));
  });
});

describe('AuthService entra a la sección del rol', () => {
  let http: HttpTestingController;
  let destinos: string[];

  const tokenDe = (role: string) => `header.${btoa(JSON.stringify({ sub: 'identity', role, exp: 9999999999 }))}.firma`;

  /** Simula la vuelta de Keycloak a la app con el código de autorización. */
  const sembrarCallback = () => {
    sessionStorage.setItem('vincula-up-keycloak-state', 'state-1');
    vi.stubGlobal('location', { search: '?code=abc&state=state-1', origin: 'http://localhost:4200', pathname: '/' });
    vi.stubGlobal('history', { replaceState: () => {} });
  };

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
    destinos = [];
    // Doble del Router: la navegación real no aplica en un test de servicio.
    const routerDoble = {
      navigateByUrl: vi.fn(async (url: string) => {
        destinos.push(url);
        return true;
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerDoble },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it.each<UserRole>(['ADMIN', 'CLIENTE', 'PROFESIONAL'])(
    'lleva a la sección del rol al completar el login: %s', (role) => {
      sembrarCallback();
      const auth = TestBed.runInInjectionContext(() => new AuthService());

      http
        .expectOne((req) => req.url.includes('/protocol/openid-connect/token'))
        .flush({ access_token: tokenDe(role), refresh_token: 'refresh', expires_in: 300 });
      http.expectOne((req) => req.url.endsWith('/usuarios/por-keycloak')).flush({
        id: 'user', keycloakId: 'identity', nombre: 'Ana', apellido: 'Díaz',
        email: 'ana@vincula-up.local', rolNegocio: role,
      });
      // La foto se pide sola al terminar el login.
      http.expectOne((req) => req.url.endsWith('/usuarios/yo')).flush({ fotoUrl: 'data:image/png;base64,FOTO' });

      expect(destinos).toEqual([role === 'ADMIN' ? '/admin' : '/solicitudes']);
      expect(auth.currentUser()?.fotoUrl).toBe('data:image/png;base64,FOTO');
    },
  );
});
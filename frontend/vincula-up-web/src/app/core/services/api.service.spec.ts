import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

describe('ApiService.describeError', () => {
  let apiService: ApiService;
  const fallback = 'No se pudo completar la operación.';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: AuthService, useValue: { getToken: () => null } },
      ],
    });
    apiService = TestBed.inject(ApiService);
  });

  it('returns the real backend message for a 409 conflict with a top-level message', () => {
    const result = apiService.describeError({
      status: 409,
      message: 'Un profesional suspendido no puede activarse desde este flujo',
    }, fallback);
    expect(result).toBe('Un profesional suspendido no puede activarse desde este flujo');
  });

  it('returns the backend message from the nested error object for a 409 conflict', () => {
    const result = apiService.describeError({
      status: 409,
      error: { message: 'La solicitud no permite esta transicion desde ACEPTADA' },
    }, fallback);
    expect(result).toBe('La solicitud no permite esta transicion desde ACEPTADA');
  });

  it('returns the generic fallback for a 409 conflict without a message', () => {
    const result = apiService.describeError({ status: 409, error: {} }, fallback);
    expect(result).toBe('La solicitud ya está en un estado distinto y no se puede mover ahora.');
  });

  it('capitalizes the first letter of the backend message', () => {
    const result = apiService.describeError({
      status: 409,
      message: 'algo salió mal',
    }, fallback);
    expect(result.charAt(0)).toBe('A');
    expect(result).toBe('Algo salió mal');
  });

  it('returns the forbidden message for 403', () => {
    expect(apiService.describeError({ status: 403, message: 'Forbidden' }, fallback))
      .toBe('No tenés permiso para realizar esta acción.');
  });

  it('returns the not-found message for 404', () => {
    expect(apiService.describeError({ status: 404, message: 'Not Found' }, fallback))
      .toBe('La solicitud o el recurso ya no está disponible.');
  });

  it('returns the login message for 401', () => {
    expect(apiService.describeError({ status: 401, message: 'Unauthorized' }, fallback))
      .toBe('Necesitás volver a iniciar sesión para continuar.');
  });

  it('returns the raw message for an unknown status with a message', () => {
    expect(apiService.describeError({ status: 500, message: 'Internal server error' }, fallback))
      .toBe('Internal server error');
  });

  it('returns the fallback for an unknown status without a message', () => {
    expect(apiService.describeError({ status: 0 }, fallback)).toBe(fallback);
  });

  it('does not swallow the backend message when the status is 409', () => {
    const result = apiService.describeError({
      status: 409,
      error: { message: 'Este profesional ya está activado en otro dispositivo' },
    }, fallback);
    expect(result).toBe('Este profesional ya está activado en otro dispositivo');
    expect(result).not.toBe('La solicitud ya está en un estado distinto y no se puede mover ahora.');
  });
});

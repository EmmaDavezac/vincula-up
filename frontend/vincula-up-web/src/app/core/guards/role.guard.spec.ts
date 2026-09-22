import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, Subject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user-profile';
import { routes } from '../../app.routes';
import { requireActivationAccess, requireRequestsAccess, requireRole } from './role.guard';

describe('Role guards', () => {
  let role: UserRole | null;
  let status: Subject<boolean>;
  const auth = {
    refreshSession: vi.fn(),
    isAuthenticated: () => role !== null,
    hasRole: (expected: UserRole) => role === expected,
    loadProfessionalStatus: () => status.asObservable(),
  };

  beforeEach(() => {
    role = null;
    status = new Subject<boolean>();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  async function run(guard: CanActivateFn): Promise<boolean | string> {
    const result = TestBed.runInInjectionContext(() => guard(
      {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot,
    ));
    const resolved = await (isObservable(result) ? firstValueFrom(result) : result);
    return typeof resolved === 'boolean' ? resolved : TestBed.inject(Router).serializeUrl(resolved as import('@angular/router').UrlTree);
  }

  it.each<UserRole | null>([null, 'CLIENTE', 'PROFESIONAL', 'ADMIN'])(
    'restricts the configured directory route to ADMIN: role=%s', async (currentRole) => {
      role = currentRole;
      const guards = routes.find((route) => route.path === 'directorio')?.canActivate;
      expect(guards).toHaveLength(1);
      expect(await run(guards![0] as CanActivateFn)).toBe(
        role === 'ADMIN' ? true : role === null ? '/ingresar' : '/no-autorizado',
      );
    },
  );

  it.each(['admin', 'solicitar', 'solicitudes', 'activar-perfil'])(
    'blocks anonymous access to the configured private route: %s', async (path) => {
      const guards = routes.find((route) => route.path === path)?.canActivate;
      expect(guards).toHaveLength(1);
      expect(await run(guards![0] as CanActivateFn)).toBe('/ingresar');
    },
  );

  it.each(['', 'como-funciona'])('keeps the public page accessible: %s', (path) => {
    const route = routes.find((entry) => entry.path === path);
    expect(route).toBeDefined();
    expect(route?.canActivate).toBeUndefined();
  });

  it('redirects anonymous visitors to login', async () => {
    expect(await run(requireRequestsAccess)).toBe('/ingresar');
    expect(await run(requireActivationAccess)).toBe('/ingresar');
    expect(await run(requireRole('ADMIN'))).toBe('/ingresar');
  });

  it('allows clients to view and create requests but not administer or activate', async () => {
    role = 'CLIENTE';
    expect(await run(requireRequestsAccess)).toBe(true);
    expect(await run(requireRole('CLIENTE'))).toBe(true);
    expect(await run(requireRole('ADMIN'))).toBe('/no-autorizado');
    expect(await run(requireActivationAccess)).toBe('/no-autorizado');
  });

  it('allows admins only into the administration flow', async () => {
    role = 'ADMIN';
    expect(await run(requireRole('ADMIN'))).toBe(true);
    expect(await run(requireRequestsAccess)).toBe('/no-autorizado');
    expect(await run(requireRole('CLIENTE'))).toBe('/no-autorizado');
  });

  it.each([true, false])('waits for the server before granting request access: active=%s', async (active) => {
    role = 'PROFESIONAL';
    let settled = false;
    const result = run(requireRequestsAccess).then((value) => { settled = true; return value; });
    await Promise.resolve();
    expect(settled).toBe(false);
    status.next(active);
    expect(await result).toBe(active ? true : '/activar-perfil');
  });

  it.each([true, false])('checks the server before opening activation: active=%s', async (active) => {
    role = 'PROFESIONAL';
    const result = run(requireActivationAccess);
    status.next(active);
    expect(await result).toBe(active ? '/solicitudes' : true);
    expect(await run(requireRole('CLIENTE'))).toBe('/no-autorizado');
  });
});

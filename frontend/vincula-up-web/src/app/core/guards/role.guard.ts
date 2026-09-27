import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserRole } from '../models/user-profile';
import { AuthService } from '../services/auth.service';

export function requireRole(role: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    auth.refreshSession();

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/ingresar']);
    }

    return auth.hasRole(role) ? true : router.createUrlTree(['/no-autorizado']);
  };
}

export function requireAnyRole(roles: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    auth.refreshSession();

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/ingresar']);
    }

    return roles.some((role) => auth.hasRole(role)) ? true : router.createUrlTree(['/no-autorizado']);
  };
}

export const redirectToKeycloak: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  auth.refreshSession();

  if (auth.isAuthenticated()) {
    return router.createUrlTree([inicioDeSesion(auth.currentUser()?.role)]);
  }

  auth.loginWithKeycloak().subscribe();
  return false;
};

/** Primer destino de cada rol al entrar con sesión. */
export function inicioDeSesion(role: UserRole | undefined): string {
  return role === 'ADMIN' ? '/admin' : '/solicitudes';
}

/**
 * La landing es sólo para visitantes: en cuanto hay sesión se entra derecho a la
 * app. Va como guard (y no dentro del componente) para que la portada no llegue a
 * pintarse al volver atrás del navegador ni al restaurar la sesión.
 */
export const redirectIfAuthenticated: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  auth.refreshSession();

  const user = auth.currentUser();
  if (!user) {
    return true;
  }

  return router.createUrlTree([inicioDeSesion(user.role)]);
};

export const requireRequestsAccess: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  auth.refreshSession();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/ingresar']);
  }

  if (auth.hasRole('CLIENTE')) {
    return true;
  }

  if (auth.hasRole('PROFESIONAL')) {
    return auth.loadProfessionalStatus().pipe(
      map((active) => active ? true : router.createUrlTree(['/activar-perfil'])),
    );
  }

  return router.createUrlTree(['/no-autorizado']);
};

export const requireActivationAccess: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  auth.refreshSession();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/ingresar']);
  }

  if (!auth.hasRole('PROFESIONAL')) {
    return router.createUrlTree(['/no-autorizado']);
  }

  return auth.loadProfessionalStatus().pipe(
    map((active) => active ? router.createUrlTree(['/solicitudes']) : true),
  );
};

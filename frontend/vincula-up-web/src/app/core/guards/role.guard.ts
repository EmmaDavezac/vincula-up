import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user-profile';
import { AuthService } from '../services/auth.service';

export function requireRole(role: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/ingresar']);
    }

    return auth.hasRole(role) ? true : router.createUrlTree(['/no-autorizado']);
  };
}

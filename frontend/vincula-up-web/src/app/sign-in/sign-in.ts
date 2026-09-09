import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loginError = this.auth.loginError;

  loginWithKeycloak(): void {
    this.auth.loginWithKeycloak().subscribe((ok) => {
      if (ok) {
        this.router.navigate(['/']);
      }
    });
  }
}

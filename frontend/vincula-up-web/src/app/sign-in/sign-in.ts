import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loginError = this.auth.loginError;

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      void this.auth.loginWithKeycloak().subscribe();
    } else {
      void this.router.navigate(['/']);
    }
  }
}

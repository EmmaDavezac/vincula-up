import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { VuIcon } from '../shared/icon/icon';

@Component({
	selector: 'app-sign-in',
	imports: [RouterLink, VuIcon],
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

	/** El acceso real sigue siendo OIDC contra Keycloak: acá solo se dispara. */
	ingresar(): void {
		void this.auth.loginWithKeycloak().subscribe();
	}
}

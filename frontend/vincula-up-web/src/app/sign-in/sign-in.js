import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { VuIcon } from '../shared/icon/icon';
import { LoadingScreen } from '../shared/loading-screen/loading-screen';
let SignIn = class SignIn {
    auth = inject(AuthService);
    router = inject(Router);
    loginError = this.auth.loginError;
    loginRedirecting = this.auth.loginRedirecting;
    ngOnInit() {
        if (!this.auth.isAuthenticated()) {
            void this.auth.loginWithKeycloak().subscribe();
        }
        else {
            void this.router.navigate(['/']);
        }
    }
    /** El acceso real sigue siendo OIDC contra Keycloak: acá solo se dispara. */
    ingresar() {
        void this.auth.loginWithKeycloak().subscribe();
    }
};
SignIn = __decorate([
    Component({
        selector: 'app-sign-in',
        imports: [RouterLink, VuIcon, LoadingScreen],
        templateUrl: './sign-in.html',
        styleUrl: './sign-in.css',
    })
], SignIn);
export { SignIn };

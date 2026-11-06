import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { VuIcon } from '../icon/icon';
let AuthLoading = class AuthLoading {
    auth = inject(AuthService);
};
AuthLoading = __decorate([
    Component({
        selector: 'app-auth-loading',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [VuIcon],
        templateUrl: './auth-loading.html',
        styleUrl: './auth-loading.css',
    })
], AuthLoading);
export { AuthLoading };

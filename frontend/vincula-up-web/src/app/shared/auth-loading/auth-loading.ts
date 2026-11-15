import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
	selector: 'app-auth-loading',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [],
	templateUrl: './auth-loading.html',
	styleUrl: './auth-loading.css',
})
export class AuthLoading {
	readonly auth = inject(AuthService);
}


import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { VuIcon } from '../icon/icon';

@Component({
	selector: 'app-auth-loading',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [VuIcon],
	templateUrl: './auth-loading.html',
	styleUrl: './auth-loading.css',
})
export class AuthLoading {
	readonly auth = inject(AuthService);
}


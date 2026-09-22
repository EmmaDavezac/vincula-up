import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly redirected = signal(false);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (!user || this.router.url !== '/' || this.redirected()) {
        return;
      }
      this.redirected.set(true);

            const role = user.role;
      const target = role === 'ADMIN' ? '/admin' : '/solicitudes';

      void this.router.navigate([target], { replaceUrl: true });
    });
  }
}

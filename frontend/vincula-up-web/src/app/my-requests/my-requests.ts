import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { RequestService } from '../core/services/request.service';

@Component({
  imports: [RouterLink],
  selector: 'app-my-requests',
  styleUrl: './my-requests.css',
  templateUrl: './my-requests.html',
})
export class MyRequests {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly requestService = inject(RequestService);
  readonly requests = this.requestService.myRequests;

  constructor() {
    const userId = this.auth.currentUser()?.id;
    if (userId) {
      this.api.getMyRequests(userId).pipe(
        catchError(() => of(null)),
      ).subscribe((requests) => {
        if (requests) {
          this.requestService.replace(requests);
        }
      });
    }
  }
}

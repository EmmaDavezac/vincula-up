import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RequestService } from '../core/services/request.service';

@Component({
  imports: [RouterLink],
  selector: 'app-my-requests',
  styleUrl: './my-requests.css',
  templateUrl: './my-requests.html',
})
export class MyRequests {
  readonly requests = inject(RequestService).myRequests;
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { DirectoryService } from '../core/services/directory.service';
import { RequestService } from '../core/services/request.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-request',
  styleUrl: './request.css',
  templateUrl: './request.html',
})
export class Request {
  private readonly route = inject(ActivatedRoute);
  private readonly directoryService = inject(DirectoryService);
  private readonly requestService = inject(RequestService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly professional = this.directoryService.getProfessionals().find(
    (item) => item.id === this.route.snapshot.queryParamMap.get('professionalId'),
  ) ?? this.directoryService.getProfessionals()[0];
  readonly date = signal('');
  readonly time = signal('');
  readonly address = signal('');
  readonly submitted = signal(false);

  submit(): void {
    if (!this.date() || !this.time() || !this.address().trim()) {
      return;
    }

    const fechaHoraPropuesta = `${this.date()}T${this.time()}:00`;
    const payload = {
      clienteId: this.auth.currentUser()?.id ?? '',
      profesionalId: this.professional.id,
      especialidadId: this.professional.especialidades?.[0]?.id ?? '00000000-0000-0000-0000-000000000001',
      direccionServicio: this.address().trim(),
      fechaHoraPropuesta,
    };

    this.api.createRequest(payload).pipe(
      catchError(() => of(null)),
    ).subscribe((created) => {
      if (!created) {
        this.requestService.create({
          professionalId: this.professional.id,
          professionalName: this.professional.name,
          specialty: this.professional.specialty,
          date: this.date(),
          time: this.time(),
          address: this.address().trim(),
        });
      }
      this.submitted.set(true);
    });
  }
}

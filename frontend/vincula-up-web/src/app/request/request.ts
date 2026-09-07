import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  readonly professional = this.directoryService.getProfessionals().find(
    (item) => item.id === Number(this.route.snapshot.queryParamMap.get('professionalId')),
  ) ?? this.directoryService.getProfessionals()[0];
  readonly date = signal('');
  readonly time = signal('');
  readonly address = signal('');
  readonly submitted = signal(false);

  submit(): void {
    if (!this.date() || !this.time() || !this.address().trim()) {
      return;
    }

    this.requestService.create({
      professionalId: this.professional.id,
      professionalName: this.professional.name,
      specialty: this.professional.specialty,
      date: this.date(),
      time: this.time(),
      address: this.address().trim(),
    });
    this.submitted.set(true);
  }
}

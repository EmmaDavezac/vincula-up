import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { DirectoryService } from '../core/services/directory.service';
import { RequestService } from '../core/services/request.service';

@Component({
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-request',
  styleUrl: './request.css',
  templateUrl: './request.html',
})
export class Request {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly directoryService = inject(DirectoryService);
  private readonly requestService = inject(RequestService);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly selectedProfessionalId = this.route.snapshot.queryParamMap.get('professionalId');
  readonly professional = this.directoryService.getProfessionals().find(
    (item) => item.id === this.selectedProfessionalId,
  ) ?? this.directoryService.getProfessionals()[0];
  readonly date = signal('');
  readonly time = signal('');
  readonly address = signal('');
  readonly gpsPosition = signal<{ latitude: number; longitude: number; address: string; source: string } | null>(null);
  readonly gpsLoading = signal(false);
  readonly gpsError = signal('');
  readonly submitted = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    if (!this.selectedProfessionalId || !this.professional) {
      this.router.navigate(['/directorio']);
    }
  }

  submit(): void {
    this.errorMessage.set('');

    if (!this.date()) {
      this.errorMessage.set('Elegí una fecha para la visita.');
      return;
    }

    if (!this.time()) {
      this.errorMessage.set('Elegí un horario aproximado para la visita.');
      return;
    }

    if (!this.address().trim()) {
      this.errorMessage.set('Ingresá la dirección del servicio.');
      return;
    }

    this.lookupGps();

    const clienteId = this.auth.currentUser()?.id;
    if (!clienteId) {
      this.errorMessage.set('Necesitás iniciar sesión como cliente para enviar una solicitud.');
      return;
    }

    const fechaHoraPropuesta = `${this.date()}T${this.time()}:00`;
    const payload = {
      clienteId,
      profesionalId: this.professional.id,
      especialidadId: this.professional.especialidades?.[0]?.id ?? '00000000-0000-0000-0000-000000000001',
      direccionServicio: this.address().trim(),
      fechaHoraPropuesta,
    };

    this.api.createRequest(payload).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo enviar la solicitud'));
        return of(null);
      }),
    ).subscribe((created) => {
      if (!created) {
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
    });
  }
  lookupGps(): void {
    const address = this.address().trim();
    if (!address) {
      this.gpsError.set('Ingresá la dirección del servicio para ver el GPS.');
      return;
    }

    this.gpsError.set('');
    this.gpsLoading.set(true);
    this.api.getGpsPosition(address).pipe(
      catchError(() => {
        this.gpsError.set('No se pudo calcular la ubicación GPS.');
        this.gpsLoading.set(false);
        return of(null);
      }),
    ).subscribe((location) => {
      this.gpsLoading.set(false);
      this.gpsPosition.set(location ?? null);
    });
  }}

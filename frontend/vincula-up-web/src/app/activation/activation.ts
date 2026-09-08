import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-activation',
  styleUrl: './activation.css',
  templateUrl: './activation.html',
})
export class Activation {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly step = signal(1);
  readonly photoName = signal('');
  readonly zone = signal('');
  readonly radius = signal(10);
  readonly day = signal('Lunes');
  readonly start = signal('09:00');
  readonly end = signal('18:00');
  readonly completed = signal(false);
  readonly errorMessage = signal('');

  next(): void {
    if (this.step() < 3) {
      this.step.update((current) => current + 1);
      return;
    }

    const usuarioId = this.auth.currentUser()?.id;
    if (!usuarioId) {
      this.errorMessage.set('Necesitás iniciar sesión como profesional para activar tu perfil.');
      return;
    }

    const payload = {
      usuarioId,
      fotoUrl: this.photoName() || 'https://demo.vincula-up.local/foto-profesional.png',
      zonaCoberturaLat: 0,
      zonaCoberturaLng: 0,
      radioKm: this.radius(),
    };

    this.api.activateProfessional(payload).pipe(
      catchError((error) => {
        this.errorMessage.set(this.api.describeError(error, 'No se pudo activar tu perfil profesional'));
        return of(null);
      }),
    ).subscribe((result) => {
      if (!result || !result.id) {
        this.completed.set(true);
        return;
      }

      const day = this.day().toUpperCase();
      const availability = [{
        diaSemana: this.mapDay(day),
        horaInicio: `${this.start()}:00`,
        horaFin: `${this.end()}:00`,
      }];

      this.api.setAvailability(result.id, availability).pipe(
        catchError((error) => {
          this.errorMessage.set(this.api.describeError(error, 'Tu perfil se activó, pero no se pudo guardar la disponibilidad.'));
          return of(null);
        }),
      ).subscribe(() => {
        this.completed.set(true);
      });
    });
  }

  private mapDay(day: string): string {
    return {
      LUNES: 'LUNES',
      MARTES: 'MARTES',
      MIERCOLES: 'MIERCOLES',
      JUEVES: 'JUEVES',
      VIERNES: 'VIERNES',
      SABADO: 'SABADO',
      DOMINGO: 'DOMINGO',
    }[day] ?? 'LUNES';
  }

  previous(): void {
    this.step.update((current) => Math.max(1, current - 1));
  }

  selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.photoName.set(input.files?.[0]?.name ?? '');
  }
}

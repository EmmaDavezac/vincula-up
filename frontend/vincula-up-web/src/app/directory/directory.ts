import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DirectoryService } from '../core/services/directory.service';
import { ApiService } from '../core/services/api.service';
import { Professional } from '../core/models/professional';

import { CommonModule } from '@angular/common';
import { VuAvatar } from '../shared/avatar/avatar';
import { VuIcon } from '../shared/icon/icon';
import { AuthService } from '../core/services/auth.service';

@Component({
	imports: [CommonModule, FormsModule, RouterLink, VuAvatar, VuIcon],
	selector: 'app-directory',
	styleUrl: './directory.css',
	templateUrl: './directory.html',
})
export class Directory {
  private readonly directoryService = inject(DirectoryService);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  readonly search = signal('');
  readonly filterStatus = signal<'TODOS' | 'ACTIVO' | 'SUSPENDIDO' | 'CARGADO'>('TODOS');
  readonly professionals = signal<Professional[]>([]);
  readonly loading = signal(true);
  readonly message = signal('');

  /**
   * Estrellas según el promedio real: las llenas redondean el puntaje y las
   * vacías completan las cinco. Antes se pintaban cinco estrellas fijas aunque
   * el profesional no tuviera ninguna calificación.
   */
  estrellas(rating: number): string {
    const llenas = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }

  /** Texto del promedio con un decimal, como "4.5". */
  promedioTexto(rating: number): string {
    return (rating || 0).toFixed(1);
  }

  /** Color del badge de estado (mismos tonos que el prototipo). */
  estadoClass(estado: string | undefined): string {
    switch ((estado ?? 'ACTIVO').toUpperCase()) {
      case 'ACTIVO':
        return 'vu-badge--aceptada';
      case 'SUSPENDIDO':
        return 'vu-badge--rechazada';
      case 'CARGADO':
        return 'vu-badge--pendiente';
      default:
        return 'vu-badge--neutro';
    }
  }

  readonly filteredProfessionals = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.filterStatus();

    return this.professionals().filter((prof) => {
      const matchQuery = !query || `${prof.name} ${prof.specialty} ${prof.zone} ${prof.legajo || ''}`.toLowerCase().includes(query);
      const profStatus = (prof.estado || 'ACTIVO').toUpperCase();
      const matchStatus = status === 'TODOS' || profStatus === status;
      return matchQuery && matchStatus;
    });
  });

  constructor() {
    this.refreshProfessionals();
  }

  refreshProfessionals(): void {
    this.loading.set(true);
    this.directoryService.loadProfessionals(true)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (profs) => {
          this.professionals.set(profs);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  suspend(prof: Professional): void {
    this.api.suspendProfessional(prof.id).pipe(
      catchError((err) => {
        this.message.set(this.api.describeError(err, 'Error al suspender.'));
        return of(null);
      })
    ).subscribe((res) => {
      if (res) {
        const estado = (res as { estado?: string }).estado ?? 'SUSPENDIDO';
        this.professionals.update((list) =>
          list.map((p) => (p.id === prof.id ? { ...p, estado } : p))
        );
        this.message.set(`Profesional ${prof.legajo || prof.name} suspendido por incumplimiento de normas.`);
      }
    });
  }

  reactivate(prof: Professional): void {
    this.api.reactivateProfessional(prof.id).pipe(
      catchError((err) => {
        this.message.set(this.api.describeError(err, 'Error al reactivar.'));
        return of(null);
      })
    ).subscribe((res) => {
      if (res) {
        // El backend devuelve CARGADO si el profesional nunca completó su alta:
        // levantar el baneo no activa el perfil.
        const estado = (res as { estado?: string }).estado ?? 'ACTIVO';
        this.professionals.update((list) =>
          list.map((p) => (p.id === prof.id ? { ...p, estado } : p))
        );
        this.message.set(estado === 'CARGADO'
          ? `Baneo levantado: ${prof.legajo || prof.name} vuelve a quedar pendiente de activación.`
          : `Profesional ${prof.legajo || prof.name} reactivado.`);
      }
    });
  }
}


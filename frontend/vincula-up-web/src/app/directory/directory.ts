import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DirectoryService } from '../core/services/directory.service';
import { ApiService } from '../core/services/api.service';
import { Professional } from '../core/models/professional';

import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  imports: [CommonModule, FormsModule, RouterLink],
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


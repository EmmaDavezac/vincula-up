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

  // Edición modal / inline
  readonly editingProf = signal<Professional | null>(null);
  readonly editForm = {
    radioKm: 15,
    zonaCoberturaLat: -32.4825,
    zonaCoberturaLng: -58.2325,
  };
  readonly savingEdit = signal(false);

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

  startEdit(prof: Professional): void {
    this.editingProf.set(prof);
    this.editForm.radioKm = prof.radioKm ?? 15;
    this.editForm.zonaCoberturaLat = prof.zonaCoberturaLat ?? -32.4825;
    this.editForm.zonaCoberturaLng = prof.zonaCoberturaLng ?? -58.2325;
    this.message.set('');
  }

  cancelEdit(): void {
    this.editingProf.set(null);
  }

  saveEdit(): void {
    const prof = this.editingProf();
    if (!prof) return;

    this.savingEdit.set(true);
    this.api.activateProfessional({
      usuarioId: prof.usuarioId || prof.id,
      fotoUrl: prof.fotoUrl || '',
      zonaCoberturaLat: Number(this.editForm.zonaCoberturaLat),
      zonaCoberturaLng: Number(this.editForm.zonaCoberturaLng),
      radioKm: Number(this.editForm.radioKm),
    }).pipe(
      catchError((err) => {
        this.message.set(this.api.describeError(err, 'No se pudo guardar los cambios del profesional.'));
        return of(null);
      })
    ).subscribe((res) => {
      this.savingEdit.set(false);
      if (res) {
        this.message.set('Zona y cobertura actualizadas con éxito.');
        this.editingProf.set(null);
        this.refreshProfessionals();
      }
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
        this.professionals.update((list) =>
          list.map((p) => (p.id === prof.id ? { ...p, estado: 'SUSPENDIDO' } : p))
        );
        this.message.set(`Profesional ${prof.legajo || prof.name} suspendido.`);
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
        this.professionals.update((list) =>
          list.map((p) => (p.id === prof.id ? { ...p, estado: 'ACTIVO' } : p))
        );
        this.message.set(`Profesional ${prof.legajo || prof.name} reactivado.`);
      }
    });
  }
}


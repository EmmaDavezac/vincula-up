import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';

interface AdminProfessional {
  id: string;
  legajo: string;
  estado: string;
  especialidades: Array<{ nombre: string }>;
}

interface SpecialtyOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private readonly api = inject(ApiService);
  readonly professionals = signal<AdminProfessional[]>([]);
  readonly specialties = signal<SpecialtyOption[]>([]);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly submitting = signal(false);

  readonly form = {
    usuarioId: '',
    legajo: '',
    especialidadIds: [] as string[],
  };

  constructor() {
    this.loadProfessionals();
  }

  private loadProfessionals(): void {
    this.loading.set(true);
    forkJoin({
      cargados: this.api.getProfessionals('CARGADO').pipe(
        catchError((error) => {
          this.message.set(this.api.describeError(error, 'No se pudo cargar la lista de profesionales cargados.'));
          return of([]);
        }),
      ),
      activos: this.api.getProfessionals('ACTIVO').pipe(
        catchError((error) => {
          this.message.set(this.api.describeError(error, 'No se pudo cargar la lista de profesionales activos.'));
          return of([]);
        }),
      ),
      especialidades: this.api.getSpecialties().pipe(
        catchError((error) => {
          this.message.set(this.api.describeError(error, 'No se pudieron cargar las especialidades disponibles.'));
          return of([]);
        }),
      ),
    }).subscribe(({ cargados, activos, especialidades }) => {
      this.professionals.set([...cargados, ...activos] as unknown as AdminProfessional[]);
      this.specialties.set((especialidades as SpecialtyOption[]) ?? []);
      this.loading.set(false);
    });
  }

  toggleSpecialty(id: string): void {
    const current = new Set(this.form.especialidadIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.form.especialidadIds = [...current];
  }

  createProfessional(): void {
    if (!this.form.usuarioId.trim() || !this.form.legajo.trim() || this.form.especialidadIds.length === 0) {
      this.message.set('Completá usuario, legajo y al menos una especialidad.');
      return;
    }

    this.submitting.set(true);
    this.api.createProfessional({
      usuarioId: this.form.usuarioId.trim(),
      legajo: this.form.legajo.trim(),
      especialidadIds: this.form.especialidadIds,
    }).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo dar de alta el profesional.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.submitting.set(false);
      if (result) {
        this.message.set('Profesional dado de alta correctamente.');
        this.form.usuarioId = '';
        this.form.legajo = '';
        this.form.especialidadIds = [];
        this.loadProfessionals();
      }
    });
  }

  suspend(professional: AdminProfessional): void {
    this.api.suspendProfessional(professional.id).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo suspender el profesional.'));
        return of(null);
      }),
    ).subscribe((result) => {
      if (result) {
        this.professionals.update((items) => items.map((item) =>
          item.id === professional.id ? { ...item, estado: 'SUSPENDIDO' } : item,
        ));
        this.message.set('Profesional suspendido correctamente.');
      }
    });
  }
}

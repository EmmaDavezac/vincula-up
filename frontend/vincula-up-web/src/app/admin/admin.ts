import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, catchError, map, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';

interface AdminProfessional {
  id: string;
  usuarioId: string;
  legajo: string;
  estado: string;
  especialidades: Array<{ id: string; nombre: string }>;
}

interface SpecialtyOption {
  id: string;
  nombre: string;
}

interface UserOption {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
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
  readonly users = signal<UserOption[]>([]);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly submitting = signal(false);

  readonly form = {
    usuarioId: '',
    legajo: '',
    especialidadIds: [] as string[],
  };

  /** Edición del padrón (legajo + especialidades). */
  readonly editingId = signal<string | null>(null);
  readonly editForm = {
    legajo: '',
    especialidadIds: [] as string[],
  };
  readonly savingEdit = signal(false);
  readonly deletingId = signal<string | null>(null);

  /** Gestión del catálogo de especialidades. */
  readonly specialtyBusy = signal(false);
  readonly renamingId = signal<string | null>(null);
  nuevaEspecialidad = '';
  renameValue = '';

  constructor() {
    this.loadProfessionals();
  }

  private loadProfessionals(): void {
    this.loading.set(true);
    forkJoin({
      profesionales: this.api.getProfessionals(undefined, true).pipe(
        catchError((error) => {
          this.message.set(this.api.describeError(error, 'No se pudo cargar la lista de profesionales.'));
          return of([]);
        }),
      ),
      especialidades: this.api.getSpecialties().pipe(
        catchError((error) => {
          this.message.set(this.api.describeError(error, 'No se pudieron cargar las especialidades disponibles.'));
          return of([]);
        }),
      ),
      usuarios: this.api.getUsers('PROFESIONAL').pipe(
        catchError(() => of([])),
      ),
    }).subscribe(({ profesionales, especialidades, usuarios }) => {
      this.professionals.set(profesionales as unknown as AdminProfessional[]);
      this.specialties.set((especialidades as SpecialtyOption[]) ?? []);
      this.users.set((usuarios as UserOption[]) ?? []);
      this.loading.set(false);
    });
  }

  toggleSpecialty(id: string): void {
    this.form.especialidadIds = this.toggleId(this.form.especialidadIds, id);
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
        this.message.set('Profesional creado: queda pendiente de activación hasta que complete su perfil desde su cuenta.');
        this.form.usuarioId = '';
        this.form.legajo = '';
        this.form.especialidadIds = [];
        this.loadProfessionals();
      }
    });
  }

  // --- Edición del padrón -------------------------------------------------

  startEdit(professional: AdminProfessional): void {
    this.editingId.set(professional.id);
    this.editForm.legajo = professional.legajo;
    this.editForm.especialidadIds = professional.especialidades.map((item) => item.id);
    this.message.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  toggleEditSpecialty(id: string): void {
    this.editForm.especialidadIds = this.toggleId(this.editForm.especialidadIds, id);
  }

  saveEdit(professional: AdminProfessional): void {
    if (!this.editForm.legajo.trim() || this.editForm.especialidadIds.length === 0) {
      this.message.set('El legajo y al menos una especialidad son obligatorios.');
      return;
    }

    this.savingEdit.set(true);
    this.api.updateProfessional(professional.id, {
      usuarioId: professional.usuarioId,
      legajo: this.editForm.legajo.trim(),
      especialidadIds: this.editForm.especialidadIds,
    }).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo actualizar el profesional.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.savingEdit.set(false);
      if (result) {
        this.message.set('Profesional actualizado correctamente.');
        this.editingId.set(null);
        this.loadProfessionals();
      }
    });
  }

  // --- Baja definitiva ----------------------------------------------------

  remove(professional: AdminProfessional): void {
    if (!window.confirm(`¿Eliminar definitivamente al profesional ${professional.legajo}? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.deletingId.set(professional.id);
    this.api.deleteProfessional(professional.id).pipe(
      map(() => true),
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo eliminar el profesional.'));
        return of(false);
      }),
    ).subscribe((deleted) => {
      this.deletingId.set(null);
      if (deleted) {
        this.professionals.update((items) => items.filter((item) => item.id !== professional.id));
        this.message.set('Profesional dado de baja definitivamente.');
      }
    });
  }

  // --- Baneo / levantamiento de baneo --------------------------------------

  suspend(professional: AdminProfessional): void {
    this.api.suspendProfessional(professional.id).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo suspender el profesional.'));
        return of(null);
      }),
    ).subscribe((result) => {
      if (result) {
        const estado = (result as { estado?: string }).estado ?? 'SUSPENDIDO';
        this.applyEstado(professional.id, estado);
        this.message.set(`Profesional ${professional.legajo} baneado por incumplimiento de normas.`);
      }
    });
  }

  reactivate(professional: AdminProfessional): void {
    this.api.reactivateProfessional(professional.id).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo reactivar el profesional.'));
        return of(null);
      }),
    ).subscribe((result) => {
      if (result) {
        // El backend devuelve CARGADO si nunca completó su alta: el baneo no activa perfiles.
        const estado = (result as { estado?: string }).estado ?? 'ACTIVO';
        this.applyEstado(professional.id, estado);
        this.message.set(estado === 'CARGADO'
          ? `Baneo levantado: ${professional.legajo} vuelve a quedar pendiente de activación.`
          : `Profesional ${professional.legajo} reactivado correctamente.`);
      }
    });
  }

  // --- Gestión de especialidades -------------------------------------------

  createSpecialty(): void {
    const nombre = this.nuevaEspecialidad.trim();
    if (!nombre) {
      this.message.set('Escribí el nombre de la especialidad.');
      return;
    }

    this.specialtyBusy.set(true);
    this.api.saveSpecialty(null, nombre).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo crear la especialidad.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.specialtyBusy.set(false);
      if (result) {
        this.nuevaEspecialidad = '';
        this.message.set('Especialidad agregada al catálogo.');
        this.loadProfessionals();
      }
    });
  }

  startRename(specialty: SpecialtyOption): void {
    this.renamingId.set(specialty.id);
    this.renameValue = specialty.nombre;
    this.message.set('');
  }

  cancelRename(): void {
    this.renamingId.set(null);
  }

  saveRename(specialty: SpecialtyOption): void {
    const nombre = this.renameValue.trim();
    if (!nombre) {
      this.message.set('El nombre de la especialidad no puede quedar vacío.');
      return;
    }

    this.specialtyBusy.set(true);
    this.api.saveSpecialty(specialty.id, nombre).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo renombrar la especialidad.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.specialtyBusy.set(false);
      if (result) {
        this.renamingId.set(null);
        this.message.set('Especialidad renombrada correctamente.');
        this.loadProfessionals();
      }
    });
  }

  deleteSpecialty(specialty: SpecialtyOption): void {
    if (!window.confirm(`¿Eliminar la especialidad "${specialty.nombre}" del catálogo?`)) {
      return;
    }

    this.specialtyBusy.set(true);
    this.api.deleteSpecialty(specialty.id).pipe(
      map(() => true),
      catchError((error) => {
        // 409: la especialidad está asignada a profesionales.
        this.message.set(this.api.describeError(error, 'No se pudo eliminar la especialidad.'));
        return of(false);
      }),
    ).subscribe((deleted) => {
      this.specialtyBusy.set(false);
      if (deleted) {
        this.message.set('Especialidad eliminada del catálogo.');
        this.loadProfessionals();
      }
    });
  }

  // --- Helpers de plantilla --------------------------------------------------

  statusClass(estado: string | null | undefined): string {
    return `status ${(estado ?? '').toLowerCase()}`;
  }

  estadoLabel(estado: string | null | undefined): string {
    const value = (estado ?? '').toUpperCase();
    if (!value) {
      return 'SIN ESTADO';
    }
    return value === 'CARGADO' ? 'PENDIENTE DE ACTIVACIÓN' : value;
  }

  specialtiesLabel(professional: AdminProfessional): string {
    const nombres = professional.especialidades?.map((item) => item.nombre) ?? [];
    return nombres.length > 0 ? nombres.join(', ') : 'Sin especialidad';
  }

  private toggleId(ids: string[], id: string): string[] {
    const current = new Set(ids);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    return [...current];
  }

  private applyEstado(id: string, estado: string): void {
    this.professionals.update((items) => items.map((item) =>
      item.id === id ? { ...item, estado } : item,
    ));
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
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

/** Usuario del padrón (profesional invitado o cliente) con su estado administrativo. */
interface AdminUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fotoUrl?: string;
  rolNegocio: string;
  estado?: string;
  keycloakId?: string | null;
}

interface UserDetail {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fotoUrl?: string;
  rolNegocio: string;
  estado?: string;
  keycloakId?: string | null;
  legajo?: string;
  especialidades?: Array<{ id: string; nombre: string }>;
  profesion?: string;
}

@Component({
  selector: 'app-admin',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private readonly api = inject(ApiService);

  readonly professionals = signal<AdminProfessional[]>([]);
  readonly specialties = signal<SpecialtyOption[]>([]);
  readonly clients = signal<AdminUser[]>([]);
  readonly usuariosProfesionales = signal<Map<string, AdminUser>>(new Map());

  readonly loading = signal(true);
  readonly message = signal('');
  readonly submitting = signal(false);
  readonly clientBusyId = signal<string | null>(null);

  readonly form = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    legajo: '',
    especialidadIds: [] as string[],
  };

  readonly editingId = signal<string | null>(null);
  readonly editForm = {
    legajo: '',
    especialidadIds: [] as string[],
  };
  readonly savingEdit = signal(false);
  readonly deletingId = signal<string | null>(null);

  readonly specialtyBusy = signal(false);
  readonly renamingId = signal<string | null>(null);
  readonly detailBusyId = signal<string | null>(null);
  readonly detailUser = signal<UserDetail | null>(null);

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
      usuariosProfesionales: this.api.getUsers('PROFESIONAL').pipe(
        map((response) => {
          const lista = (response as AdminUser[]) ?? [];
          // El callback tipa la tupla: sin eso TypeScript infiere (string | AdminUser)[]
          // y new Map() rechaza la entrada.
          const porId = lista.map((usuario): [string, AdminUser] => [usuario.id, usuario]);
          this.usuariosProfesionales.set(new Map<string, AdminUser>(porId));
          return lista;
        }),
        catchError(() => of([])),
      ),
      clientes: this.api.getUsers('CLIENTE')
        .pipe(
        catchError((error) => {
          this.message.set(this.api.describeError(error, 'No se pudo cargar la lista de clientes.'));
          return of([]);
        }),
      ),
    }).subscribe(({ profesionales, especialidades, usuariosProfesionales, clientes }) => {
      this.professionals.set(profesionales as unknown as AdminProfessional[]);
      this.specialties.set((especialidades as SpecialtyOption[]) ?? []);
      this.clients.set((clientes as AdminUser[]) ?? []);
      this.loading.set(false);
    });
  }

  toggleSpecialty(id: string): void {
    this.form.especialidadIds = this.toggleId(this.form.especialidadIds, id);
  }

  createProfessionalInvite(): void {
    if (!this.form.nombre.trim() || !this.form.apellido.trim() || !this.form.email.trim()) {
      this.message.set('Completá nombre, apellido y email del profesional.');
      return;
    }
    if (!this.form.legajo.trim() || this.form.especialidadIds.length === 0) {
      this.message.set('Completá el legajo y al menos una especialidad.');
      return;
    }

    this.submitting.set(true);
    this.api.createProfessionalInvite({
      nombre: this.form.nombre.trim(),
      apellido: this.form.apellido.trim(),
      email: this.form.email.trim(),
      telefono: this.form.telefono.trim(),
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
        this.message.set(
          `Invitación registrada para ${this.form.email.trim()}: el profesional se registra en Keycloak con ese email y activa su perfil.`,
        );
        this.form.nombre = '';
        this.form.apellido = '';
        this.form.email = '';
        this.form.telefono = '';
        this.form.legajo = '';
        this.form.especialidadIds = [];
        this.loadProfessionals();
      }
    });
  }

  startEdit(professional: AdminProfessional): void {
    this.editingId.set(professional.id);
    this.editForm.legajo = professional.legajo;
    this.editForm.especialidadIds = professional.especialidades?.map((s) => s.id) ?? [];
    this.savingEdit.set(false);
    this.message.set('');
  }

  toggleEditSpecialty(id: string): void {
    this.editForm.especialidadIds = this.toggleId(this.editForm.especialidadIds, id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.message.set('');
  }

  saveEdit(professional: AdminProfessional): void {
    const legajo = this.editForm.legajo.trim();
    if (!legajo) {
      this.message.set('El legajo no puede quedar vacío.');
      return;
    }
    if (this.editForm.especialidadIds.length === 0) {
      this.message.set('Seleccioná al menos una especialidad.');
      return;
    }

    // ms-profesionales sólo administra legajo y especialidades: los datos
    // personales viven en ms-usuarios y no se editan desde este panel.
    const body = {
      usuarioId: professional.usuarioId,
      legajo,
      especialidadIds: this.editForm.especialidadIds,
    };

    this.savingEdit.set(true);
    this.api.updateProfessional(professional.id, body).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo actualizar el profesional.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.savingEdit.set(false);
      if (result) {
        this.editingId.set(null);
        this.message.set('Profesional actualizado en el padrón.');
        this.loadProfessionals();
      }
    });
  }

  remove(professional: AdminProfessional): void {
    if (this.deletingId() === professional.id) {
      return;
    }
    if (!window.confirm(`¿Eliminar el profesional "${professional.legajo}" del padrón?`)) {
      return;
    }

    this.deletingId.set(professional.id);
    this.api.deleteProfessional(professional.id).pipe(
      map(() => true),
      catchError((error) => {
        this.deletingId.set(null);
        this.message.set(this.api.describeError(error, 'No se pudo eliminar el profesional.'));
        return of(false);
      }),
    ).subscribe((deleted) => {
      this.deletingId.set(null);
      if (deleted) {
        this.message.set('Profesional eliminado del padrón.');
        this.loadProfessionals();
      }
    });
  }

  suspend(professional: AdminProfessional): void {
    this.applyEstadoProfesional(professional.id, 'SUSPENDIDO');
    this.api.suspendProfessional(professional.id).pipe(
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo banear al profesional.'));
        return of(null);
      }),
    ).subscribe((result) => {
      if (result) {
        this.message.set('Profesional banneado. Podés levantar el baneo desde acá cuando corresponda.');
      }
    });
  }

  reactivate(professional: AdminProfessional): void {
    this.api.reactivateProfessional(professional.id).pipe(
      map((result) => {
        // El backend devuelve CARGADO (no ACTIVO): el baneo no activa perfiles.
        const response = result as { estado?: string };
        this.applyEstadoProfesional(professional.id, response.estado ?? 'CARGADO');
        return result;
      }),
      catchError((error) => {
        this.message.set(this.api.describeError(error, 'No se pudo levantar el baneo.'));
        return of(null);
      }),
    ).subscribe((result) => {
      if (result) {
        this.message.set('Baneo levantado. El profesional puede operar de nuevo.');
        this.loadProfessionals();
      }
    });
  }

  banClient(client: AdminUser): void {
    this.clientBusyId.set(client.id);
    this.api.suspendUser(client.id).pipe(
      catchError((error) => {
        this.clientBusyId.set(null);
        this.message.set(this.api.describeError(error, 'No se pudo banear al cliente.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.clientBusyId.set(null);
      if (result) {
        // Sólo se actualiza el estado en pantalla: recargar todo el padrón
        // pisaba el cambio con la foto vieja del backend.
        this.applyEstadoCliente(client.id, 'SUSPENDIDO');
        this.message.set('Cliente banneado. La cuenta no puede operar hasta que se levante el baneo.');
      }
    });
  }

  unbanClient(client: AdminUser): void {
    this.clientBusyId.set(client.id);
    this.api.reactivateUser(client.id).pipe(
      catchError((error) => {
        this.clientBusyId.set(null);
        this.message.set(this.api.describeError(error, 'No se pudo levantar el baneo.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.clientBusyId.set(null);
      if (result) {
        this.applyEstadoCliente(client.id, 'ACTIVO');
        this.message.set('Baneo levantado. El cliente puede operar de nuevo.');
      }
    });
  }

  private applyEstadoProfesional(id: string, estado: string): void {
    this.professionals.update((items) =>
      items.map((item) => (item.id === id ? { ...item, estado } : item)),
    );
  }

  private applyEstadoCliente(id: string, estado: string): void {
    this.clients.update((items) =>
      items.map((item) => (item.id === id ? { ...item, estado } : item)),
    );
  }

  openDetail(user: AdminUser): void {
    this.detailBusyId.set(user.id);
    this.detailUser.set(null);
    this.message.set('');

    if (user.rolNegocio === 'PROFESIONAL') {
      const usuario = this.usuariosProfesionales().get(user.id);
      const profesional = this.professionals().find((p) => p.usuarioId === user.id);
      this.detailBusyId.set(null);
      this.detailUser.set({
        id: user.id,
        nombre: usuario?.nombre ?? '',
        apellido: usuario?.apellido ?? '',
        email: usuario?.email ?? '',
        telefono: usuario?.telefono ?? '',
        fotoUrl: usuario?.fotoUrl ?? '',
        rolNegocio: user.rolNegocio,
        estado: user.estado ?? '',
        keycloakId: usuario?.keycloakId ?? null,
        legajo: profesional?.legajo ?? '',
        especialidades: profesional?.especialidades ?? [],
        profesion: '',
      });
      return;
    }

    this.api.getUserById(user.id).pipe(
      map((ficha) => {
        const detalle: UserDetail = {
          id: user.id,
          nombre: user.nombre ?? '',
          apellido: user.apellido ?? '',
          email: user.email ?? '',
          telefono: ficha?.telefono ?? user.telefono ?? '',
          fotoUrl: (ficha?.fotoUrl ?? user.fotoUrl) ?? '',
          rolNegocio: user.rolNegocio,
          estado: user.estado ?? '',
          keycloakId: user.keycloakId ?? null,
          legajo: undefined,
          especialidades: [],
          profesion: '',
        };
        return detalle;
      }),
      catchError(() => of(null)),
    ).subscribe((ficha) => {
      this.detailBusyId.set(null);
      this.detailUser.set(ficha ?? {
        id: user.id,
        nombre: user.nombre ?? '',
        apellido: user.apellido ?? '',
        email: user.email ?? '',
        telefono: user.telefono ?? '',
        fotoUrl: user.fotoUrl ?? '',
        rolNegocio: user.rolNegocio,
        estado: user.estado ?? '',
        keycloakId: user.keycloakId ?? null,
        legajo: undefined,
        especialidades: [],
        profesion: '',
      });
    });
  }

  closeDetail(): void {
    this.detailBusyId.set(null);
    this.detailUser.set(null);
    this.message.set('');
  }

  createSpecialty(): void {
    const nombre = this.nuevaEspecialidad.trim();
    if (!nombre) {
      this.message.set('Escribí el nombre de la especialidad.');
      return;
    }

    this.specialtyBusy.set(true);
    this.api.saveSpecialty(null, nombre).pipe(
      catchError((error) => {
        this.specialtyBusy.set(false);
        this.message.set(this.api.describeError(error, 'No se pudo agregar la especialidad.'));
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
        this.specialtyBusy.set(false);
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
        this.specialtyBusy.set(false);
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

  /** El perfil existe, pero el profesional todavía no creó su cuenta de Keycloak. */
  invitacionPendiente(professional: AdminProfessional): boolean {
    const usuario = this.usuariosProfesionales().get(professional.usuarioId);
    return usuario ? usuario.keycloakId == null : false;
  }

  clientName(client: AdminUser): string {
    return `${client.nombre ?? ''} ${client.apellido ?? ''}`.trim() || client.email;
  }

  /** Nombre visible en la ficha de detalle (profesionales o clientes). */
  detailName(user: UserDetail): string {
    return `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || user.email || 'Sin datos';
  }

  detailSpecialties(user: UserDetail): string {
    const nombres = user.especialidades?.map((item) => item.nombre) ?? [];
    return nombres.length > 0 ? nombres.join(', ') : 'Sin especialidad';
  }

  professionalToUser(professional: AdminProfessional): AdminUser {
    const usuario = this.usuariosProfesionales().get(professional.usuarioId);
    return {
      id: professional.usuarioId,
      nombre: usuario?.nombre ?? '',
      apellido: usuario?.apellido ?? '',
      email: usuario?.email ?? '',
      telefono: usuario?.telefono ?? '',
      fotoUrl: usuario?.fotoUrl ?? '',
      rolNegocio: usuario?.rolNegocio ?? 'PROFESIONAL',
      estado: professional.estado,
      keycloakId: usuario?.keycloakId ?? null,
    };
  }

  professionName(professional: AdminProfessional): string {
    const usuario = this.usuariosProfesionales().get(professional.usuarioId);
    const nombre = (usuario?.nombre ?? '') + ' ' + (usuario?.apellido ?? '');
    return nombre.trim() || professional.legajo;
  }

  professionalFoto(professional: AdminProfessional): string | undefined {
    const usuario = this.usuariosProfesionales().get(professional.usuarioId);
    return usuario?.fotoUrl;
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
}

import { Component, inject, signal } from '@angular/core';
import { forkJoin, catchError, of } from 'rxjs';
import { ApiService } from '../core/services/api.service';

interface AdminProfessional {
  id: string;
  legajo: string;
  estado: string;
  especialidades: Array<{ nombre: string }>;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private readonly api = inject(ApiService);
  readonly professionals = signal<AdminProfessional[]>([]);
  readonly loading = signal(true);
  readonly message = signal('');

  constructor() {
    forkJoin({
      cargados: this.api.getProfessionals('CARGADO').pipe(catchError(() => of([]))),
      activos: this.api.getProfessionals('ACTIVO').pipe(catchError(() => of([]))),
    }).subscribe(({ cargados, activos }) => {
      this.professionals.set([...cargados, ...activos] as unknown as AdminProfessional[]);
      this.loading.set(false);
    });
  }

  suspend(professional: AdminProfessional): void {
    this.api.suspendProfessional(professional.id).pipe(
      catchError(() => of(null)),
    ).subscribe((result) => {
      if (result) {
        this.professionals.update((items) => items.map((item) =>
          item.id === professional.id ? { ...item, estado: 'SUSPENDIDO' } : item,
        ));
        this.message.set('Profesional suspendido correctamente.');
      } else {
        this.message.set('No se pudo suspender el profesional.');
      }
    });
  }
}

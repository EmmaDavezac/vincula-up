import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DirectoryService } from '../core/services/directory.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-directory',
  styleUrl: './directory.css',
  templateUrl: './directory.html',
})
export class Directory {
  private readonly directoryService = inject(DirectoryService);
  readonly search = signal('');
  readonly professionals = signal(this.directoryService.getProfessionals());
  readonly filteredProfessionals = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.professionals();
    }

    return this.professionals().filter((professional) =>
      `${professional.name} ${professional.specialty} ${professional.zone}`.toLowerCase().includes(query),
    );
  });

  constructor() {
    this.directoryService.loadProfessionals()
      .pipe(takeUntilDestroyed())
      .subscribe((professionals) => this.professionals.set(professionals));
  }
}

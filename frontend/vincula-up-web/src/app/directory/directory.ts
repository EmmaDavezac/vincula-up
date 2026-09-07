import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DirectoryService } from '../core/services/directory.service';

@Component({
  imports: [FormsModule],
  selector: 'app-directory',
  styleUrl: './directory.css',
  templateUrl: './directory.html',
})
export class Directory {
  private readonly directoryService = inject(DirectoryService);
  readonly search = signal('');
  readonly professionals = this.directoryService.getProfessionals();
  readonly filteredProfessionals = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.professionals;
    }

    return this.professionals.filter((professional) =>
      `${professional.name} ${professional.specialty} ${professional.zone}`.toLowerCase().includes(query),
    );
  });
}

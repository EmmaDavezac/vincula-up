import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-activation',
  styleUrl: './activation.css',
  templateUrl: './activation.html',
})
export class Activation {
  readonly step = signal(1);
  readonly photoName = signal('');
  readonly zone = signal('');
  readonly radius = signal(10);
  readonly day = signal('Lunes');
  readonly start = signal('09:00');
  readonly end = signal('18:00');
  readonly completed = signal(false);

  next(): void {
    if (this.step() < 3) {
      this.step.update((current) => current + 1);
    } else {
      this.completed.set(true);
    }
  }

  previous(): void {
    this.step.update((current) => Math.max(1, current - 1));
  }

  selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.photoName.set(input.files?.[0]?.name ?? '');
  }
}

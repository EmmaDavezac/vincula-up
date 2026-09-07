import { Component, input } from '@angular/core';

@Component({
  selector: 'app-simple-page',
  template: '<section class="simple-page"><p class="eyebrow">Vincula-UP</p><h1>{{ title() }}</h1><p>{{ message() }}</p></section>',
  styles: [':host { display: block; } .simple-page { margin: 0 auto; max-width: 1180px; padding: 6rem 1.5rem; } .eyebrow { color: var(--coral); font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; } h1 { color: var(--ink); font-family: Georgia, serif; font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 400; margin: 1rem 0; } p:last-child { color: var(--muted); font-size: 1.1rem; line-height: 1.7; max-width: 34rem; }'],
})
export class SimplePage {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}

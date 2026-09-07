import { Component, input } from '@angular/core';

@Component({
  selector: 'app-access-page',
  template: '<section class="access-page"><p class="eyebrow">Vincula-UP</p><h1>{{ title() }}</h1><p>{{ message() }}</p></section>',
  styles: [':host { display: block; } .access-page { margin: 0 auto; max-width: 800px; padding: 7rem 1.5rem; } .eyebrow { color: var(--coral); font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; } h1 { color: var(--ink); font-family: Georgia, serif; font-size: clamp(2.8rem, 6vw, 5.5rem); font-weight: 400; line-height: .98; margin: 1rem 0; } p:last-child { color: var(--muted); line-height: 1.7; max-width: 34rem; }'],
})
export class AccessPage {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}

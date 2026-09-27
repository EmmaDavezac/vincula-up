import { Component, input } from '@angular/core';

@Component({
	selector: 'app-access-page',
	template: '<div class="vu-page"><section class="vu-container-sm simple-page"><p class="vu-eyebrow">Vincula-UP</p><h1 class="vu-display-sm">{{ title() }}</h1><p class="vu-body simple-page__lead">{{ message() }}</p></section></div>',
	styles: [
		`
			:host {
				display: block;
			}

			.simple-page {
				padding-bottom: 4rem;
				padding-top: 4rem;
			}

			.simple-page__lead {
				margin-top: 1.25rem;
				max-width: 34rem;
			}
		`,
	],
})
export class AccessPage {
	readonly title = input.required<string>();
	readonly message = input.required<string>();
}

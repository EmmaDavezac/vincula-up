import { Component, effect, inject } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { OperationFeedbackService } from '../../core/services/operation-feedback.service';

@Component({
	selector: 'app-operation-feedback',
	standalone: true,
	template: `
		@if (feedback.current(); as operation) {
			<div class="operation-feedback" role="status" aria-live="polite" aria-busy="true">
				<section class="operation-feedback__card">
					<div class="operation-feedback__indicator" aria-hidden="true"></div>
					<h2 class="operation-feedback__title">{{ operation.message }}</h2>
					<p class="operation-feedback__detail">{{ operation.detail }}</p>
					<div class="operation-feedback__track" aria-hidden="true">
						<span></span>
					</div>
				</section>
			</div>
		}
	`,
	styleUrl: './operation-feedback.css',
})
export class OperationFeedback {
	readonly feedback = inject(OperationFeedbackService);
	private readonly overlay = inject(Overlay);

	constructor() {
		const scrollStrategy = this.overlay.scrollStrategies.block();
		effect((onCleanup) => {
			if (!this.feedback.current()) return;
			scrollStrategy.enable();
			onCleanup(() => scrollStrategy.disable());
		});
	}
}

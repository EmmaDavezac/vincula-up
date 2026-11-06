import { __decorate } from "tslib";
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
let LoadingScreen = class LoadingScreen {
    mensaje = input.required();
    error = input('');
    reintentarClick = output();
};
LoadingScreen = __decorate([
    Component({
        selector: 'app-loading-screen',
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
		<section class="loading-screen" role="status" aria-live="polite">
			<div class="loading-screen__content">
				<div class="loading-screen__brand" aria-label="Vincula-UP">
					<span class="vu-brand-mark" aria-hidden="true">V</span>
					<span class="vu-brand-name">Vincula<em>-UP</em></span>
				</div>
				<span class="loading-screen__spinner" aria-hidden="true"></span>
				<h1>{{ mensaje() }}</h1>
				@if (error()) {
					<p class="loading-screen__error" role="alert">{{ error() }}</p>
					<button type="button" class="vu-btn vu-btn--outline" (click)="reintentarClick.emit()">
						Reintentar
					</button>
				}
			</div>
		</section>
	`,
        styles: [
            `
			.loading-screen {
				align-items: center;
				background: var(--paper);
				display: flex;
				inset: 0;
				justify-content: center;
				min-height: 100dvh;
				padding: 1.5rem;
				position: fixed;
				z-index: 100;
			}

			.loading-screen__content {
				align-items: center;
				display: flex;
				flex-direction: column;
				max-width: 24rem;
				text-align: center;
			}

			.loading-screen__brand {
				align-items: center;
				display: flex;
				gap: 0.75rem;
				margin-bottom: 3rem;
			}

			.loading-screen__spinner {
				animation: loading-spin 0.8s linear infinite;
				border: 3px solid var(--line);
				border-radius: 50%;
				border-top-color: var(--coral);
				height: 2rem;
				width: 2rem;
			}

			h1 {
				color: var(--ink);
				font-family: var(--font-serif);
				font-size: 1.5rem;
				font-weight: 600;
				line-height: 1.25;
				margin: 1.25rem 0 0;
			}

			.loading-screen__error {
				color: var(--alert-error-ink);
				font-size: 0.9375rem;
				line-height: 1.5;
				margin: 1rem 0 0;
			}

			button {
				margin-top: 1rem;
			}

			@keyframes loading-spin {
				to { transform: rotate(360deg); }
			}

			@media (prefers-reduced-motion: reduce) {
				.loading-screen__spinner { animation-duration: 2.5s; }
			}
		`,
        ],
    })
], LoadingScreen);
export { LoadingScreen };

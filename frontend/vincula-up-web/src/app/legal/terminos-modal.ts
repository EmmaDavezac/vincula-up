import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ApiService } from '../core/services/api.service';

/**
 * Aceptación de los términos y condiciones, al primer ingreso.
 *
 * <p>Es una capa sobre toda la aplicación, no una pantalla: se monta en `app.html`
 * y no usa guard, así que no se puede esquivar escribiendo una URL. No tiene botón
 * de cerrar a propósito.
 *
 * <p>Se muestra cuando hay sesión y la versión aceptada no es la vigente. El
 * backend guarda versión y fecha, así que la aceptación queda registrada y se
 * vuelve a pedir si el texto cambia.
 */
@Component({
	selector: 'app-terminos-modal',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink],
	template: `
		@if (visible()) {
			<div class="terminos-modal__overlay">
				<section class="terminos-modal" role="dialog" aria-modal="true" aria-labelledby="terminos-modal-title">
					<p class="vu-eyebrow">Antes de empezar</p>
					<h1 class="terminos-modal__title" id="terminos-modal-title">Aceptá los términos y condiciones</h1>

					<p class="terminos-modal__lead">
						Son las reglas de uso de la red y el detalle de qué datos guardamos y quién puede ver
						qué. Conviene leerlos antes de continuar.
					</p>

					<ul class="terminos-modal__puntos">
						<li>Qué hace cada rol y qué puede ver cada persona.</li>
						<li>Qué datos guardamos: cuenta, fotos, mensajes, solicitudes y zonas de cobertura.</li>
						<li>Que no usamos cookies de seguimiento ni de terceros, y por qué no hay un cartel.</li>
						<li>Cómo pedir la eliminación de tus datos.</li>
					</ul>

					<label class="terminos-modal__check">
						<input
							type="checkbox"
							class="vu-checkbox"
							[checked]="aceptado()"
							(change)="marcar($any($event.target).checked)"
						/>
						<span>
							Leí los <a routerLink="/terminos" (click)="cerrarParaLeer()">términos y condiciones</a> y los
							acepto.
						</span>
					</label>

					@if (error()) {
						<p class="vu-alert vu-alert--error" role="alert">{{ error() }}</p>
					}

					<button
						type="button"
						class="vu-btn vu-btn--ink vu-btn--pill vu-btn--block"
						[disabled]="!aceptado() || guardando()"
						(click)="aceptar()"
					>
						{{ guardando() ? 'Guardando...' : 'Aceptar y continuar' }}
					</button>
				</section>
			</div>
		}
	`,
	styles: [
		`
			/*
				Overlay a pantalla completa, por encima de la navbar y la barra inferior
				(el modal de confirmación de VuConfirm usa z-index 70; este va un poco
				más abajo porque no se superponen).
			*/
			.terminos-modal__overlay {
				align-items: center;
				background: rgb(0 0 0 / 0.45);
				display: flex;
				inset: 0;
				justify-content: center;
				padding: 1rem;
				position: fixed;
				z-index: 65;
			}

			.terminos-modal {
				background: var(--surface-card);
				border-radius: 1rem;
				box-shadow: var(--shadow-lg);
				max-height: 90vh;
				overflow-y: auto;
				padding: 1.75rem;
				width: 100%;
			}

			@media (min-width: 640px) {
				.terminos-modal {
					max-width: 30rem;
				}
			}

			.terminos-modal__title {
				font-family: var(--font-serif);
				font-size: 1.75rem;
				letter-spacing: -0.02em;
				line-height: 1.15;
				margin: 0.75rem 0 0;
			}

			.terminos-modal__lead {
				color: var(--ink);
				font-size: 0.9375rem;
				line-height: 1.6;
				margin: 1rem 0 0;
			}

			.terminos-modal__puntos {
				color: var(--muted);
				font-size: 0.875rem;
				line-height: 1.6;
				margin: 1rem 0 0;
				padding-left: 1.125rem;
			}

			.terminos-modal__puntos li + li {
				margin-top: 0.375rem;
			}

			.terminos-modal__check {
				align-items: flex-start;
				background: var(--surface-highlight);
				border-radius: 0.75rem;
				cursor: pointer;
				display: flex;
				font-size: 0.875rem;
				gap: 0.625rem;
				line-height: 1.5;
				margin: 1.25rem 0 0;
				padding: 0.875rem;
			}

			.terminos-modal__check input {
				margin-top: 0.125rem;
			}

			.terminos-modal .vu-alert {
				margin-top: 1rem;
			}

			.terminos-modal .vu-btn {
				margin-top: 1.25rem;
			}
		`,
	],
})
export class TerminosModal {
	private readonly auth = inject(AuthService);
	private readonly api = inject(ApiService);

	readonly aceptado = signal(false);
	readonly guardando = signal(false);
	readonly error = signal('');

	/**
	 * El modal se oculta mientras se lee la página de términos: ahí ya está el
	 * texto, y el overlay encima haría imposible leerlo. Al volver, la pantalla
	 * de atrás sigue intacta (por eso es una capa, no una navegación).
	 */
	private readonly leyendo = signal(false);
	readonly visible = computed(() => this.auth.terminosPendientes() && !this.leyendo());

	marcar(valor: boolean): void {
		this.aceptado.set(valor);
		this.error.set('');
	}

	cerrarParaLeer(): void {
		this.leyendo.set(true);
	}

	aceptar(): void {
		if (!this.aceptado() || this.guardando()) {
			return;
		}
		this.guardando.set(true);
		this.error.set('');
		this.auth.registrarAceptacionTerminos().pipe(
			catchError((error) => {
				this.guardando.set(false);
				this.error.set(this.api.describeError(error, 'No se pudo registrar la aceptación.'));
				return of(null);
			}),
		).subscribe(() => {
			this.guardando.set(false);
			// Si la llamada falló, `terminosPendientes` sigue en true y el modal
			// permanece: no se deja pasar a nadie que no aceptó.
		});
	}
}
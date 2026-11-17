import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VuIcon, type VuIconName } from '../shared/icon/icon';

/**
 * Landing pública: se muestra sólo a visitantes, porque la ruta lleva el guard
 * `redirectIfAuthenticated` (con sesión se entra directo a la app).
 */
@Component({
	imports: [RouterLink, VuIcon],
	selector: 'app-home',
	styleUrl: './home.css',
	templateUrl: './home.html',
})
export class Home implements AfterViewInit {
	private readonly destroyRef = inject(DestroyRef);
	private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

	readonly activeShowcaseIndex = signal(0);
	private isShowcaseInteracting = false;

	readonly showcaseSlides: ReadonlyArray<{
		title: string;
		visual: 'search' | 'profile' | 'chat';
	}> = [
		{
			visual: 'search',
			title: 'Buscá un oficio',
		},
		{
			visual: 'profile',
			title: 'Elegí con confianza',
		},
		{
			visual: 'chat',
			title: 'Coordiná tu turno',
		},
	];

	/** Recorrido del vecino al solicitar y completar un servicio. */
	readonly neighborSteps: ReadonlyArray<{ icon: VuIconName; text: string }> = [
		{ icon: 'search', text: 'Buscá por oficio, día y horario.' },
		{ icon: 'clock', text: 'Conocé qué profesionales están disponibles para ese momento.' },
		{ icon: 'send', text: 'Enviá tu solicitud y seguí su estado.' },
		{ icon: 'message-circle', text: 'Cuando la acepten, coordiná por el chat de la solicitud.' },
		{ icon: 'star', text: 'Al finalizar el trabajo, calificá el servicio.' },
	];

	/** Garantías que explican cómo funciona la confianza en la plataforma. */
	readonly guardrails: ReadonlyArray<{ icon: VuIconName; text: string }> = [
		{ icon: 'users', text: 'Los perfiles profesionales son incorporados por la Universidad; no son publicaciones abiertas.' },
		{ icon: 'map-pin', text: 'Tu dirección exacta solo se comparte cuando el profesional confirma el turno.' },
		{ icon: 'message-circle', text: 'La coordinación se realiza en el chat asociado a cada solicitud.' },
	];

	constructor() {
		if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		const intervalId = window.setInterval(() => {
			if (!this.isShowcaseInteracting) {
				this.showNextShowcase();
			}
		}, 6000);
		this.destroyRef.onDestroy(() => window.clearInterval(intervalId));
	}

	ngAfterViewInit(): void {
		if (
			typeof window === 'undefined' ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
			typeof IntersectionObserver === 'undefined'
		) {
			return;
		}

		const targets = this.host.nativeElement.querySelectorAll<HTMLElement>('[data-reveal]');
		if (targets.length === 0) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting && entry.target instanceof HTMLElement) {
						entry.target.dataset['revealed'] = 'true';
						observer.unobserve(entry.target);
					}
				}
			},
			{ rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
		);

		this.host.nativeElement.classList.add('home--motion-ready');
		targets.forEach((target) => observer.observe(target));
		this.destroyRef.onDestroy(() => observer.disconnect());
	}

	showNextShowcase(): void {
		this.activeShowcaseIndex.update((index) => (index + 1) % this.showcaseSlides.length);
	}

	showPreviousShowcase(): void {
		this.activeShowcaseIndex.update(
			(index) => (index - 1 + this.showcaseSlides.length) % this.showcaseSlides.length,
		);
	}

	setShowcaseInteraction(isInteracting: boolean): void {
		this.isShowcaseInteracting = isInteracting;
	}

	showcaseFocusLeft(event: FocusEvent): void {
		const container = event.currentTarget;
		const nextTarget = event.relatedTarget;
		if (
			container instanceof HTMLElement &&
			!(nextTarget instanceof Node && container.contains(nextTarget))
		) {
			this.setShowcaseInteraction(false);
		}
	}
}

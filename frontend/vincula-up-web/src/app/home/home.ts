import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Landing pública: se muestra sólo a visitantes, porque la ruta lleva el guard
 * `redirectIfAuthenticated` (con sesión se entra directo a la app).
 */
@Component({
	imports: [RouterLink],
	selector: 'app-home',
	styleUrl: './home.css',
	templateUrl: './home.html',
})
export class Home {
	/** Recorrido del vecino al solicitar y completar un servicio. */
	readonly neighborSteps: ReadonlyArray<string> = [
		'Buscá por oficio, día y horario.',
		'Conocé qué profesionales están disponibles para ese momento.',
		'Enviá tu solicitud y seguí su estado.',
		'Cuando la acepten, coordiná por el chat de la solicitud.',
		'Al finalizar el trabajo, calificá el servicio.',
	];

	/** Garantías que explican cómo funciona la confianza en la plataforma. */
	readonly guardrails: ReadonlyArray<string> = [
		'Los perfiles profesionales son incorporados por la Universidad; no son publicaciones abiertas.',
		'Tu dirección exacta solo se comparte cuando el profesional confirma el turno.',
		'La coordinación se realiza en el chat asociado a cada solicitud.',
	];
}

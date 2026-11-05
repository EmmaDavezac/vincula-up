import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
/**
 * Landing pública: se muestra sólo a visitantes, porque la ruta lleva el guard
 * `redirectIfAuthenticated` (con sesión se entra directo a la app).
 */
let Home = class Home {
    /** Copys del prototipo: el recorrido del vecino dentro de la app. */
    neighborSteps = [
        'Buscá por oficio y zona.',
        'Elegí un horario disponible.',
        'Esperá la confirmación del profesional.',
        'Coordiná por el chat interno.',
        'Calificá el servicio al finalizar.',
    ];
    /** Las garantías que explican por qué se puede abrir la casa a un técnico. */
    guardrails = [
        'Nadie se autopublica: cada profesional proviene del padrón de egresados.',
        'Tu dirección exacta solo se comparte cuando el profesional confirma el turno.',
        'Todo el ida y vuelta queda registrado dentro de la app.',
    ];
};
Home = __decorate([
    Component({
        imports: [RouterLink],
        selector: 'app-home',
        styleUrl: './home.css',
        templateUrl: './home.html',
    })
], Home);
export { Home };

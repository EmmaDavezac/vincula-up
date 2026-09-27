package com.vinculaup.ms_solicitudes.dto;

import java.util.UUID;

/**
 * Reputación de un profesional: promedio de las calificaciones recibidas y
 * cuántas hay. Se devuelve uno por profesional que ya recibió al menos una.
 *
 * @param promedio stars de 1 a 5, redondeado a un decimal
 * @param cantidad reseñas recibidas
 */
public record ResumenCalificacionResponse(
        UUID profesionalId,
        double promedio,
        long cantidad) {
}

package com.vinculaup.ms_solicitudes.dto;

import java.util.List;

/**
 * Reputación completa de un profesional: el promedio que se muestra en el
 * directorio y el detalle de las reseñas para que el profesional las pueda leer.
 *
 * @param promedio stars de 1 a 5, redondeado a un decimal
 * @param cantidad reseñas recibidas
 * @param reseñas detalle, de la más reciente a la más antigua
 */
public record ReputacionProfesionalResponse(
        double promedio,
        long cantidad,
        List<ResenaResponse> reseñas) {
}

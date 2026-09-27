package com.vinculaup.ms_solicitudes.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Una reseña recibida por el profesional. El comentario es opcional: puede venir
 * sólo el puntaje.
 *
 * @param clienteId id de ms-usuarios de quien calificó, para que el BFF resuelva el nombre
 */
public record ResenaResponse(
        UUID calificacionId,
        UUID solicitudId,
        Integer puntaje,
        String comentario,
        LocalDateTime fecha,
        UUID clienteId) {
}

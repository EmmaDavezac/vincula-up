package com.vinculaup.ms_solicitudes.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CalificacionResponse(
        UUID id,
        UUID solicitudId,
        Integer puntaje,
        String comentario,
        LocalDateTime fechaCalificacion) {
}

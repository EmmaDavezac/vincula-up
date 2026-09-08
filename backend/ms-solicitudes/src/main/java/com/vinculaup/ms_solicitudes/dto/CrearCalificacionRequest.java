package com.vinculaup.ms_solicitudes.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CrearCalificacionRequest(
        @NotNull UUID clienteId,
        @NotNull @Min(1) @Max(5) Integer puntaje,
        String comentario) {
}

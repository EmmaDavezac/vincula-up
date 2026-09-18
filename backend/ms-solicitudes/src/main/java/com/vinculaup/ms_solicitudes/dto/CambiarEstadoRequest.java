package com.vinculaup.ms_solicitudes.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CambiarEstadoRequest(
        @NotNull @JsonAlias({"usuarioId", "actorId"}) UUID actorId,
        String motivo) {
}

package com.vinculaup.ms_solicitudes.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record EnviarMensajeRequest(
        @NotNull @JsonAlias({"usuarioId", "emisorId", "actorId"}) UUID emisorId,
        @NotBlank String texto) {
}

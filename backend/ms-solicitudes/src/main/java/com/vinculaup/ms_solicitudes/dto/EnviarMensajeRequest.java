package com.vinculaup.ms_solicitudes.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record EnviarMensajeRequest(
        @NotNull UUID emisorId,
        @NotBlank String texto) {
}

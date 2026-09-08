package com.vinculaup.ms_solicitudes.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MensajeResponse(
        UUID id,
        UUID solicitudId,
        UUID emisorId,
        String texto,
        LocalDateTime fechaEnvio) {
}

package com.vinculaup.ms_solicitudes.client;

import java.util.UUID;

public record ProfesionalIdentidad(
        UUID id,
        UUID usuarioId,
        String estado) {
}

package com.vinculaup.ms_profesionales.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ActivarProfesionalRequest(
        @NotNull UUID usuarioId,
        String fotoUrl,
        @NotNull Double zonaCoberturaLat,
        @NotNull Double zonaCoberturaLng,
        @NotNull @DecimalMin("0.1") Double radioKm) {
}

package com.vinculaup.ms_profesionales.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record ActivarProfesionalRequest(
        @NotNull UUID usuarioId,
        UUID keycloakId,
        @Size(max = 800000, message = "La foto supera el tamaño máximo permitido") String fotoUrl,
        @NotNull Double zonaCoberturaLat,
        @NotNull Double zonaCoberturaLng,
        @NotNull @DecimalMin("0.1") Double radioKm,
        List<UUID> especialidadIds) {
}

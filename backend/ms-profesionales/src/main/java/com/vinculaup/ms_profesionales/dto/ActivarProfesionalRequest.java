package com.vinculaup.ms_profesionales.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record ActivarProfesionalRequest(
        @NotNull UUID usuarioId,
        UUID keycloakId,
        // Es la URL pública que devuelve POST /api/fotos, no la imagen en base64:
        // el archivo se sube aparte al almacenamiento de objetos.
        @Size(max = 512, message = "La URL de la foto supera el máximo permitido") String fotoUrl,
        @NotNull Double zonaCoberturaLat,
        @NotNull Double zonaCoberturaLng,
        @NotNull @DecimalMin("0.1") Double radioKm,
        List<UUID> especialidadIds) {
}

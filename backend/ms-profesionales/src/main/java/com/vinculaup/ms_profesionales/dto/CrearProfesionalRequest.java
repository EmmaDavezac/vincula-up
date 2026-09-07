package com.vinculaup.ms_profesionales.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.Set;
import java.util.UUID;

public record CrearProfesionalRequest(
        @NotNull UUID usuarioId,
        @NotBlank String legajo,
        @NotEmpty Set<UUID> especialidadIds) {
}

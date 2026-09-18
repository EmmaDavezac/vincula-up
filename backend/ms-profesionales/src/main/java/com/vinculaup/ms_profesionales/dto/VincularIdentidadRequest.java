package com.vinculaup.ms_profesionales.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Reconciliación de identidades entre {@code ms-usuarios} (usuarioId) y Keycloak (keycloakId)
 * para el perfil profesional del usuario logueado.
 */
public record VincularIdentidadRequest(
        @NotNull UUID usuarioId,
        UUID keycloakId) {
}

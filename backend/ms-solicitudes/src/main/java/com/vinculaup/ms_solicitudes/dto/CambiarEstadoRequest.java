package com.vinculaup.ms_solicitudes.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Cambio de estado de una solicitud.
 * <p>
 * {@code actorId} es la identidad de negocio (el id de ms-usuarios) y {@code keycloakId} el
 * subject del token. Las solicitudes históricas quedaron guardadas con el {@code keycloakId}
 * como {@code clienteId}/{@code profesionalId}, así que el alias permite reconocer al mismo
 * usuario sin migrar los datos existentes.
 */
public record CambiarEstadoRequest(
        @NotNull @JsonAlias({"usuarioId", "actorId"}) UUID actorId,
        String motivo,
        @JsonAlias({"aliasId", "aliasIds", "subject", "keycloakId"}) UUID keycloakId) {

    /** Constructor sin alias de Keycloak: usado por llamadas internas y tests. */
    public CambiarEstadoRequest(UUID actorId, String motivo) {
        this(actorId, motivo, null);
    }
}

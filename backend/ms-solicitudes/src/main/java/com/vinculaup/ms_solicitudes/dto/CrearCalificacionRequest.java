package com.vinculaup.ms_solicitudes.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Calificación del cliente sobre una solicitud completada.
 * <p>
 * {@code clienteId} es la identidad de negocio (el id de ms-usuarios) y {@code keycloakId} el
 * subject del token: las solicitudes históricas guardaron el {@code keycloakId} como cliente, así
 * que el alias permite validar la autoría sin migrar los datos.
 */
public record CrearCalificacionRequest(
        @NotNull @JsonAlias({"usuarioId", "clienteId", "actorId"}) UUID clienteId,
        @NotNull @Min(1) @Max(5) Integer puntaje,
        String comentario,
        @JsonAlias({"aliasId", "aliasIds", "subject", "keycloakId"}) UUID keycloakId) {

    /** Constructor sin alias de Keycloak: usado por llamadas internas y tests. */
    public CrearCalificacionRequest(UUID clienteId, Integer puntaje, String comentario) {
        this(clienteId, puntaje, comentario, null);
    }
}

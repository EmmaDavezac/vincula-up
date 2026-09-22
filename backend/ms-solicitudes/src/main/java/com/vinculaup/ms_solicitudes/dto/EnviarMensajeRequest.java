package com.vinculaup.ms_solicitudes.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Mensaje enviado dentro de una solicitud.
 * <p>
 * {@code emisorId} es la identidad de negocio (el id de ms-usuarios) y {@code keycloakId} el
 * subject del token: las solicitudes históricas guardaron el {@code keycloakId} como participante,
 * así que el alias permite reconocer al emisor sin migrar los datos.
 */
public record EnviarMensajeRequest(
        @NotNull @JsonAlias({"usuarioId", "emisorId", "actorId"}) UUID emisorId,
        @NotBlank String texto,
        @JsonAlias({"aliasId", "aliasIds", "subject", "keycloakId"}) UUID keycloakId) {

    /** Constructor sin alias de Keycloak: usado por llamadas internas y tests. */
    public EnviarMensajeRequest(UUID emisorId, String texto) {
        this(emisorId, texto, null);
    }
}

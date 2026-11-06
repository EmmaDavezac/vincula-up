package com.vinculaup.ms_usuarios.dto;

import java.util.UUID;

/**
 * Vincula una invitación del padrón (usuario sin {@code keycloakId}) con la
 * cuenta de Keycloak que acaba de crear el administrador. Lo usa el BFF durante
 * el alta de un profesional, para guardar el vínculo sin esperar a que la persona
 * entre por primera vez.
 */
public record VincularKeycloakRequest(UUID keycloakId) {
}

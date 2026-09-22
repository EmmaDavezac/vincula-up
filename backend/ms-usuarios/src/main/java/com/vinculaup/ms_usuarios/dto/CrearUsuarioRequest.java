package com.vinculaup.ms_usuarios.dto;

import com.vinculaup.ms_usuarios.entity.RolNegocio;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Alta de usuario. {@code keycloakId} es opcional: un administrador puede
 * <b>invitar</b> a un profesional cargando sus datos (sin cuenta Keycloak
 * todavía) y la identidad se vincula en el primer login por email.
 */
public record CrearUsuarioRequest(
        UUID keycloakId,
        @NotBlank String nombre,
        @NotBlank String apellido,
        @NotBlank @Email String email,
        String telefono,
        @NotNull RolNegocio rolNegocio) {
}

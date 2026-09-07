package com.vinculaup.ms_usuarios.dto;

import com.vinculaup.ms_usuarios.entity.RolNegocio;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CrearUsuarioRequest(
        @NotNull UUID keycloakId,
        @NotBlank String nombre,
        @NotBlank String apellido,
        @NotBlank @Email String email,
        @NotBlank String telefono,
        @NotNull RolNegocio rolNegocio) {
}

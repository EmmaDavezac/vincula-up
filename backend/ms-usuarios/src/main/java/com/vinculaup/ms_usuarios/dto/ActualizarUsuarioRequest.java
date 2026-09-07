package com.vinculaup.ms_usuarios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ActualizarUsuarioRequest(
        @NotBlank String nombre,
        @NotBlank String apellido,
        @NotBlank @Email String email,
        @NotBlank String telefono,
        String fotoUrl) {
}

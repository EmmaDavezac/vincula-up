package com.vinculaup.ms_usuarios.dto;

import com.vinculaup.ms_usuarios.entity.RolNegocio;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UsuarioResponse(
        UUID id,
        UUID keycloakId,
        String nombre,
        String apellido,
        String email,
        String telefono,
        String fotoUrl,
        RolNegocio rolNegocio,
        OffsetDateTime fechaAlta) {
}

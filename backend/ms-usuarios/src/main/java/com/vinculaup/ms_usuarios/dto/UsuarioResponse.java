package com.vinculaup.ms_usuarios.dto;

import com.vinculaup.ms_usuarios.entity.EstadoUsuario;
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
        EstadoUsuario estado,
        OffsetDateTime fechaAlta,
        /** Si aceptó alguna versión de los términos. La versión vigente la compara el frontend. */
        boolean terminosAceptado,
        /** Versión que aceptó. Si el texto cambia, no coincide y hay que volver a pedir. */
        String terminosVersion,
        OffsetDateTime terminosAceptadoEn) {
}

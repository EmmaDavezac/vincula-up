package com.vinculaup.ms_usuarios.dto;

/**
 * Actualización parcial del perfil ("Mi cuenta" o panel admin). Todos los
 * campos son opcionales: solo se modifican los que llegan no nulos. Los
 * vacíos/en blanco se ignoran (salvo fotoUrl, donde null/vacío = quitar foto)
 * para nunca borrar datos por accidente. El email nunca se cambia por acá:
 * {@code Usuario.update} ignora nulos/vacíos.
 */
public record ActualizarUsuarioRequest(
        String nombre,
        String apellido,
        String email,
        String telefono,
        String fotoUrl) {
}

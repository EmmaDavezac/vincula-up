package com.vinculaup.ms_usuarios.entity;

/**
 * Estado administrativo de la cuenta.
 * <p>
 * {@code ACTIVO} es el estado normal. {@code SUSPENDIDO} representa una
 * suspensión administrativa reversible desde el panel de administración.
 */
public enum EstadoUsuario {
    ACTIVO,
    SUSPENDIDO
}

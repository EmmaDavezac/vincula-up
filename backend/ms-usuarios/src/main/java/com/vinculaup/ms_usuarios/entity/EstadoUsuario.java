package com.vinculaup.ms_usuarios.entity;

/**
 * Estado administrativo de la cuenta.
 * <p>
 * {@code ACTIVO} es el estado normal. {@code SUSPENDIDO} representa un baneo
 * aplicado por un administrador por incumplimiento de normas; es reversible
 * desde el panel de administración.
 */
public enum EstadoUsuario {
    ACTIVO,
    SUSPENDIDO
}

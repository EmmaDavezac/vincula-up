package com.vinculaup.ms_solicitudes.entity;

/**
 * Quién canceló el turno. Se guarda para que las dos partes sepan si la baja la
 * pidió el cliente o el profesional, y no un texto genérico.
 */
public enum RolCancelacion {
    CLIENTE,
    PROFESIONAL
}

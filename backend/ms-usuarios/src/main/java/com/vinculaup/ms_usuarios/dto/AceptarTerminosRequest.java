package com.vinculaup.ms_usuarios.dto;

/**
 * Aceptación de los términos y condiciones.
 *
 * @param version versión del documento que se aceptó (lo manda el frontend, que
 *                es donde vive el texto; acá solo se registra)
 */
public record AceptarTerminosRequest(String version) {
}
package com.vinculaup.ms_solicitudes.dto;

import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.RolCancelacion;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * @param canceladaPorRol qué lado canceló el turno ({@code CLIENTE} o {@code PROFESIONAL}).
 *                        Es {@code null} en las solicitudes canceladas antes de que se
 *                        registrara el autor de la cancelación.
 */
public record SolicitudResponse(
        UUID id,
        UUID clienteId,
        UUID profesionalId,
        UUID especialidadId,
        String direccionServicio,
        String descripcion,
        Double latitud,
        Double longitud,
        LocalDateTime fechaHoraPropuesta,
        LocalDateTime fechaHoraFinPropuesta,
        EstadoSolicitud estado,
        String motivoCancelacion,
        RolCancelacion canceladaPorRol,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaCambioEstado) {
}

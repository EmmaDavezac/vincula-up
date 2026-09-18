package com.vinculaup.ms_solicitudes.dto;

import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import java.time.LocalDateTime;
import java.util.UUID;

public record SolicitudResponse(
        UUID id,
        UUID clienteId,
        UUID profesionalId,
        UUID especialidadId,
        String direccionServicio,
        Double latitud,
        Double longitud,
        LocalDateTime fechaHoraPropuesta,
        EstadoSolicitud estado,
        String motivoCancelacion,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaCambioEstado) {
}

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
        LocalDateTime fechaHoraPropuesta,
        EstadoSolicitud estado,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaCambioEstado) {
}

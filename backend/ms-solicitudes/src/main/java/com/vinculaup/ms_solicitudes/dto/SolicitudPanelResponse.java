package com.vinculaup.ms_solicitudes.dto;

import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ficha de solicitud para el panel de administración: sólo los datos que alimentan los
 * indicadores del dashboard (recorrido de las solicitudes, demanda por especialidad,
 * satisfacción).
 * No expone la dirección del cliente ni el chat.
 *
 * @param puntaje calificación recibida (1 a 5) o {@code null} si todavía no fue calificada
 */
public record SolicitudPanelResponse(
        UUID id,
        UUID clienteId,
        UUID profesionalId,
        UUID especialidadId,
        EstadoSolicitud estado,
        Integer puntaje,
        LocalDateTime fechaHoraPropuesta,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaCambioEstado) {
}
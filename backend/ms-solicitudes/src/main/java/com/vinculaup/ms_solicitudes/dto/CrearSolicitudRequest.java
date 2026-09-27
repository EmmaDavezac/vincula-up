package com.vinculaup.ms_solicitudes.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;

public record CrearSolicitudRequest(
        @NotNull UUID clienteId,
        @NotNull UUID profesionalId,
        @NotNull UUID especialidadId,
        @NotBlank String direccionServicio,
        Double latitud,
        Double longitud,
        @NotNull @Future LocalDateTime fechaHoraPropuesta,
        /** Fin del turno: el horario que se muestra es un rango. */
        LocalDateTime fechaHoraFinPropuesta,
        @NotBlank(message = "Contanos brevemente el problema")
        @Size(max = 1000, message = "El resumen no puede superar los 1000 caracteres")
        String descripcion) {
}

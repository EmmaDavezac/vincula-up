package com.vinculaup.ms_solicitudes.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public record CrearSolicitudRequest(
        @NotNull UUID clienteId,
        @NotNull UUID profesionalId,
        @NotNull UUID especialidadId,
        @NotBlank String direccionServicio,
        Double latitud,
        Double longitud,
        @NotNull @Future LocalDateTime fechaHoraPropuesta) {
}

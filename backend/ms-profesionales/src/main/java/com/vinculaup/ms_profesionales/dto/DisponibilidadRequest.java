package com.vinculaup.ms_profesionales.dto;

import com.vinculaup.ms_profesionales.entity.DiaSemana;
import jakarta.validation.constraints.NotNull;
import java.time.LocalTime;

public record DisponibilidadRequest(
        @NotNull DiaSemana diaSemana,
        @NotNull LocalTime horaInicio,
        @NotNull LocalTime horaFin) {
}

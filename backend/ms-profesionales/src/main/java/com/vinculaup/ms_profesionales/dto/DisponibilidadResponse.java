package com.vinculaup.ms_profesionales.dto;

import com.vinculaup.ms_profesionales.entity.DiaSemana;
import java.time.LocalTime;
import java.util.UUID;

public record DisponibilidadResponse(
        UUID id,
        UUID profesionalId,
        DiaSemana diaSemana,
        LocalTime horaInicio,
        LocalTime horaFin) {
}

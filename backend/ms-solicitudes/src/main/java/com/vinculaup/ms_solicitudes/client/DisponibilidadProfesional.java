package com.vinculaup.ms_solicitudes.client;

import java.time.LocalTime;

public record DisponibilidadProfesional(
        String diaSemana,
        LocalTime horaInicio,
        LocalTime horaFin) {
}

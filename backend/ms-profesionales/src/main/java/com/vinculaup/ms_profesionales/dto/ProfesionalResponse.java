package com.vinculaup.ms_profesionales.dto;

import com.vinculaup.ms_profesionales.entity.EstadoProfesional;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

public record ProfesionalResponse(
        UUID id,
        UUID usuarioId,
        String legajo,
        String fotoUrl,
        Double zonaCoberturaLat,
        Double zonaCoberturaLng,
        Double radioKm,
        EstadoProfesional estado,
        OffsetDateTime fechaCarga,
        OffsetDateTime fechaActivacion,
        Set<EspecialidadResponse> especialidades) {
}

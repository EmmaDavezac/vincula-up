package com.vinculaup.ms_solicitudes.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CambiarEstadoRequest(@NotNull UUID actorId, String motivo) {
}

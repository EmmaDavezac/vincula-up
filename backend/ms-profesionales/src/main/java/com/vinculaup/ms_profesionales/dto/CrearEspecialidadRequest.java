package com.vinculaup.ms_profesionales.dto;

import jakarta.validation.constraints.NotBlank;

public record CrearEspecialidadRequest(@NotBlank String nombre) {
}

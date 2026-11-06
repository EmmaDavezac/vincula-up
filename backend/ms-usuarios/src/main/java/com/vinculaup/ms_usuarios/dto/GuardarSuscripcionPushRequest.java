package com.vinculaup.ms_usuarios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GuardarSuscripcionPushRequest(
        @NotBlank @Size(max = 2048) String endpoint,
        @NotBlank @Size(max = 512) String p256dh,
        @NotBlank @Size(max = 256) String auth) {
}
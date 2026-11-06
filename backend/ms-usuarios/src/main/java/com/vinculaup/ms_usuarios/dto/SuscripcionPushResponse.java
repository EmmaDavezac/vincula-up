package com.vinculaup.ms_usuarios.dto;

import com.vinculaup.ms_usuarios.entity.SuscripcionPush;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SuscripcionPushResponse(
        UUID id,
        UUID usuarioId,
        String endpoint,
        String p256dh,
        String auth,
        OffsetDateTime actualizadaEn) {

    public static SuscripcionPushResponse desde(SuscripcionPush suscripcion) {
        return new SuscripcionPushResponse(
                suscripcion.getId(),
                suscripcion.getUsuarioId(),
                suscripcion.getEndpoint(),
                suscripcion.getClavePublica(),
                suscripcion.getSecretoAutenticacion(),
                suscripcion.getActualizadaEn());
    }
}
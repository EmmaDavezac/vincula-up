package com.vinculaup.bff_web.service;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Tarea periódica para detectar y procesar solicitudes expiradas.
 * <p>
 * Verifica periódicamente si alguna solicitud pendiente superó su fecha límite
 * de respuesta. Cuando una solicitud expira:
 * 1. ms-solicitudes la marca como VENCIDA.
 * 2. Se envía un correo electrónico transaccional al cliente informándole que
 *    el profesional no respondió a tiempo y que puede solicitar a otro profesional.
 * 3. Se envía una notificación WebPush al cliente con el mismo aviso.
 */
@Component
public class SolicitudExpiracionScheduler {

    private static final Logger log = LoggerFactory.getLogger(SolicitudExpiracionScheduler.class);

    private final BackendGateway gateway;
    private final NotificacionService notificar;
    private final WebPushService webPush;

    public SolicitudExpiracionScheduler(BackendGateway gateway, NotificacionService notificar, WebPushService webPush) {
        this.gateway = gateway;
        this.notificar = notificar;
        this.webPush = webPush;
    }

    @Scheduled(fixedDelay = 15000, initialDelay = 10000)
    public void verificarSolicitudesExpiradas() {
        try {
            JsonNode expiradas = gateway.expirarSolicitudesPendientes();
            if (expiradas != null && expiradas.isArray()) {
                for (JsonNode solicitud : expiradas) {
                    notificarSolicitudExpirada(solicitud);
                }
            }
        } catch (Exception ex) {
            log.debug("Verificación de solicitudes expiradas: {}", ex.getMessage());
        }
    }

    private void notificarSolicitudExpirada(JsonNode solicitud) {
        try {
            String clienteIdStr = solicitud.path("clienteId").asText(null);
            if (clienteIdStr == null || clienteIdStr.isBlank()) {
                return;
            }
            UUID clienteId = UUID.fromString(clienteIdStr);
            JsonNode destinatario = gateway.buscarUsuarioPorIdOKeycloakId(clienteId);
            if (destinatario == null || !destinatario.isObject()) {
                return;
            }

            String nombre = (destinatario.path("nombre").asText("") + " "
                    + destinatario.path("apellido").asText("")).trim();
            String email = destinatario.path("email").asText(null);

            // Envío del correo transaccional
            notificar.avisarCambioSolicitud(email, nombre, "VENCIDA", "El profesional no respondió a tiempo.");

            // Envío de la notificación WebPush
            String especialidad = solicitud.path("especialidadNombre").asText("");
            String detail = "El profesional no respondió a tiempo. Podés solicitar a otro profesional.";
            String body = especialidad.isBlank() ? detail : especialidad + ": " + detail;
            webPush.enviar(clienteId, "Solicitud vencida", body, "/solicitudes");

            log.info("Aviso de solicitud vencida {} enviado a {}",
                    solicitud.path("id").asText(""), email);
        } catch (Exception ex) {
            log.warn("No se pudo notificar la expiración de la solicitud {}: {}",
                    solicitud.path("id").asText(""), ex.getMessage());
        }
    }
}

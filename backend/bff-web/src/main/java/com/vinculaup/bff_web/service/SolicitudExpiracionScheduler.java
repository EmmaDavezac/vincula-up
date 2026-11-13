package com.vinculaup.bff_web.service;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.vinculaup.bff_web.config.WebSocketAuthorizationContext;
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
 * 4. Se envía un correo electrónico al profesional informándole que su solicitud
 *    venció por falta de respuesta dentro del plazo.
 * <p>
 * Las llamadas internas a ms-usuarios y ms-profesionales se autentican con el
 * token de cuenta de servicio (client_credentials) obtenido de Keycloak, ya que
 * el scheduler corre en un hilo de fondo sin contexto HTTP ni sesión WebSocket.
 */
@Component
public class SolicitudExpiracionScheduler {

    private static final Logger log = LoggerFactory.getLogger(SolicitudExpiracionScheduler.class);

    private final BackendGateway gateway;
    private final NotificacionService notificar;
    private final WebPushService webPush;
    private final KeycloakAdminService keycloakAdminService;
    private final WebSocketAuthorizationContext authContext;

    public SolicitudExpiracionScheduler(
            BackendGateway gateway,
            NotificacionService notificar,
            WebPushService webPush,
            KeycloakAdminService keycloakAdminService,
            WebSocketAuthorizationContext authContext) {
        this.gateway = gateway;
        this.notificar = notificar;
        this.webPush = webPush;
        this.keycloakAdminService = keycloakAdminService;
        this.authContext = authContext;
    }

    @Scheduled(fixedDelay = 15000, initialDelay = 10000)
    public void verificarSolicitudesExpiradas() {
        log.debug("Verificando solicitudes pendientes expiradas...");
        try {
            JsonNode expiradas = gateway.expirarSolicitudesPendientes();
            if (expiradas != null && expiradas.isArray() && !expiradas.isEmpty()) {
                log.info("Scheduler: {} solicitud(es) expirada(s) encontrada(s)", expiradas.size());
                // Obtener token de servicio una sola vez para todas las solicitudes
                String token = keycloakAdminService.tokenDeServicio().orElse(null);
                if (token == null) {
                    log.warn("Scheduler: no se pudo obtener el token de servicio para notificar las solicitudes vencidas");
                    return;
                }
                for (JsonNode solicitud : expiradas) {
                    // Ejecutar las notificaciones con el token de servicio en el contexto
                    authContext.withAuthorization("Bearer " + token, () -> {
                        notificarSolicitudExpirada(solicitud);
                        return null;
                    });
                }
            }
        } catch (Exception ex) {
            log.warn("Error al verificar solicitudes expiradas: {}", ex.getMessage());
        }
    }

    private void notificarSolicitudExpirada(JsonNode solicitud) {
        String solicitudId = solicitud.path("id").asText("");

        // --- Notificar al cliente ---
        try {
            String clienteIdStr = solicitud.path("clienteId").asText(null);
            if (clienteIdStr != null && !clienteIdStr.isBlank()) {
                UUID clienteId = UUID.fromString(clienteIdStr);
                JsonNode cliente = gateway.buscarUsuarioPorIdOKeycloakId(clienteId);
                if (cliente != null && cliente.isObject()) {
                    String nombre = (cliente.path("nombre").asText("") + " "
                            + cliente.path("apellido").asText("")).trim();
                    String email = cliente.path("email").asText(null);

                    notificar.avisarCambioSolicitud(email, nombre, "VENCIDA", null);

                    String especialidad = solicitud.path("especialidadNombre").asText("");
                    String detailCliente = "El profesional no respondió a tiempo. Podés solicitar a otro profesional.";
                    String bodyCliente = especialidad.isBlank() ? detailCliente : especialidad + ": " + detailCliente;
                    webPush.enviar(clienteId, "Solicitud vencida", bodyCliente, "/solicitudes");

                    log.info("Aviso de solicitud vencida {} enviado al cliente {}", solicitudId, email);
                }
            }
        } catch (Exception ex) {
            log.warn("No se pudo notificar al cliente la expiración de la solicitud {}: {}", solicitudId, ex.getMessage());
        }

        // --- Notificar al profesional ---
        try {
            String profesionalIdStr = solicitud.path("profesionalId").asText(null);
            if (profesionalIdStr != null && !profesionalIdStr.isBlank()) {
                UUID profesionalId = UUID.fromString(profesionalIdStr);
                JsonNode perfil = gateway.buscarProfesionalPorIdOUsuario(profesionalId);
                if (perfil != null) {
                    // buscarProfesionalPorIdOUsuario puede devolver un array o un objeto
                    JsonNode perfilObj = perfil.isArray() && !perfil.isEmpty() ? perfil.get(0) : perfil;
                    String usuarioIdStr = perfilObj.path("usuarioId").asText(null);
                    if (usuarioIdStr != null && !usuarioIdStr.isBlank()) {
                        UUID usuarioId = UUID.fromString(usuarioIdStr);
                        JsonNode profesionalUsuario = gateway.buscarUsuarioPorIdOKeycloakId(usuarioId);
                        if (profesionalUsuario != null && profesionalUsuario.isObject()) {
                            String nombreProf = (profesionalUsuario.path("nombre").asText("") + " "
                                    + profesionalUsuario.path("apellido").asText("")).trim();
                            String emailProf = profesionalUsuario.path("email").asText(null);

                            notificar.avisarCambioSolicitud(emailProf, nombreProf,
                                    "VENCIDA_PROFESIONAL", null);

                            String especialidad = solicitud.path("especialidadNombre").asText("");
                            String detailProf = "Una solicitud de servicio venció por falta de respuesta dentro del plazo límite.";
                            String bodyProf = especialidad.isBlank() ? detailProf : especialidad + ": " + detailProf;
                            webPush.enviar(usuarioId, "Solicitud vencida sin respuesta", bodyProf, "/solicitudes");

                            log.info("Aviso de solicitud vencida {} enviado al profesional {}", solicitudId, emailProf);
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("No se pudo notificar al profesional la expiración de la solicitud {}: {}", solicitudId, ex.getMessage());
        }
    }
}

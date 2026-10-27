package com.vinculaup.bff_web.service;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.vinculaup.bff_web.client.ProfesionalesClient;
import com.vinculaup.bff_web.client.SolicitudesClient;
import com.vinculaup.bff_web.client.UsuariosClient;
import feign.FeignException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class BackendGateway {

    private static final Logger log = LoggerFactory.getLogger(BackendGateway.class);
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final UsuariosClient usuarios;
    private final ProfesionalesClient profesionales;
    private final SolicitudesClient solicitudes;

    public BackendGateway(UsuariosClient usuarios, ProfesionalesClient profesionales,
            SolicitudesClient solicitudes) {
        this.usuarios = usuarios;
        this.profesionales = profesionales;
        this.solicitudes = solicitudes;
    }

    /* ── Usuarios ────────────────────────────────────────────────────────── */

    public JsonNode listarProfesionales(String estado, Boolean todos) {
        if (Boolean.TRUE.equals(todos)) {
            return ejecutar(() -> profesionales.listar(null, true));
        }
        return ejecutar(() -> profesionales.listar(estado, null));
    }

    public JsonNode crearProfesional(JsonNode body) {
        return ejecutar(() -> profesionales.crear(body));
    }

    public JsonNode crearEspecialidad(JsonNode body) {
        return ejecutar(() -> profesionales.crearEspecialidad(body));
    }

    public JsonNode actualizarEspecialidad(UUID id, JsonNode body) {
        return ejecutar(() -> profesionales.actualizarEspecialidad(id, body));
    }

    public void eliminarEspecialidad(UUID id) {
        ejecutarSinRespuesta(() -> profesionales.eliminarEspecialidad(id));
    }

    public JsonNode actualizarProfesional(UUID id, JsonNode body) {
        return ejecutar(() -> profesionales.actualizarProfesional(id, body));
    }

    public JsonNode crearUsuario(JsonNode body) {
        return ejecutar(() -> usuarios.crear(body));
    }

    public JsonNode actualizarUsuario(UUID id, JsonNode body) {
        return ejecutar(() -> usuarios.actualizar(id, body));
    }

    /** Vincula una invitación del padrón con la cuenta de Keycloak recién creada. */
    public JsonNode vincularKeycloakUsuario(UUID usuarioId, UUID keycloakId) {
        var body = MAPPER.createObjectNode();
        body.put("keycloakId", keycloakId.toString());
        return ejecutar(() -> usuarios.vincularKeycloak(usuarioId, body));
    }

    public void eliminarUsuario(UUID id) {
        ejecutarSinRespuesta(() -> usuarios.eliminar(id));
    }

    public JsonNode listarEspecialidades() {
        return ejecutar(() -> profesionales.listarEspecialidades());
    }

    public JsonNode listarProfesionalesPorUsuario(List<UUID> usuarioIds) {
        return ejecutar(() -> profesionales.listarPorUsuarioIds(usuarioIds));
    }

    public JsonNode miPerfilProfesional(UUID usuarioId, UUID keycloakId) {
        return ejecutar(() -> profesionales.miPerfil(usuarioId, keycloakId));
    }

    public JsonNode vincularIdentidad(JsonNode body) {
        return ejecutar(() -> profesionales.vincular(body));
    }

    public JsonNode activarProfesionalPorUsuario(JsonNode body) {
        return ejecutar(() -> profesionales.activarPorUsuario(body));
    }

    public JsonNode activarProfesional(UUID id, JsonNode body) {
        return ejecutar(() -> profesionales.activar(id, body));
    }

    public JsonNode suspenderProfesional(UUID id) {
        return ejecutar(() -> profesionales.suspender(id));
    }

    public JsonNode reactivarProfesional(UUID id) {
        return ejecutar(() -> profesionales.reactivar(id));
    }

    public JsonNode listarDisponibilidad(UUID profesionalId) {
        return ejecutar(() -> profesionales.listarDisponibilidad(profesionalId));
    }

    public JsonNode reemplazarDisponibilidad(UUID profesionalId, List<JsonNode> requests) {
        return ejecutar(() -> profesionales.reemplazarDisponibilidad(profesionalId, requests));
    }

    /* ── Usuarios (ms-usuarios) ─────────────────────────────────────────── */

    public JsonNode listarUsuarios(String rol, String estado) {
        return ejecutar(() -> usuarios.listar(rol, estado));
    }

    public JsonNode buscarUsuarioPorEmail(String email) {
        return ejecutar(() -> usuarios.buscarPorEmail(email));
    }

    public JsonNode buscarUsuarioPorId(UUID id) {
        return ejecutar(() -> usuarios.buscarPorId(id));
    }

    public JsonNode aceptarTerminos(UUID id, JsonNode body) {
        return ejecutar(() -> usuarios.aceptarTerminos(id, body));
    }

    public JsonNode buscarUsuarioPorKeycloak(UUID keycloakId, String email, String nombre,
            String apellido, String rol) {
        return ejecutar(() -> usuarios.buscarPorKeycloakId(keycloakId, email, nombre, apellido, rol));
    }

    /* ── Solicitudes ───────────────────────────────────────────────────── */

    public JsonNode geocodificar(String direccion) {
        return ejecutar(() -> solicitudes.geocodificar(direccion));
    }

    public JsonNode crearSolicitud(JsonNode body) {
        return ejecutar(() -> solicitudes.crear(body));
    }

    public JsonNode listarSolicitudesParaPanel() {
        return ejecutar(() -> solicitudes.listarParaPanel());
    }

    public JsonNode listarSolicitudesPropias(UUID usuarioId, List<UUID> aliasIds,
            String tipo, String rol) {
        return ejecutar(() -> solicitudes.listarPropias(usuarioId, aliasIds, tipo, rol));
    }

    public JsonNode aceptarSolicitud(UUID id, JsonNode body) {
        return ejecutar(() -> solicitudes.aceptar(id, body));
    }

    public JsonNode rechazarSolicitud(UUID id, JsonNode body) {
        return ejecutar(() -> solicitudes.rechazar(id, body));
    }

    public JsonNode completarSolicitud(UUID id, JsonNode body) {
        return ejecutar(() -> solicitudes.completar(id, body));
    }

    public JsonNode cancelarSolicitud(UUID id, JsonNode body) {
        return ejecutar(() -> solicitudes.cancelar(id, body));
    }

    /* ── Utilidades ───────────────────────────────────────────────────── */

    private interface FeignCallable<T> {
        T llamar();
    }

    private <T> T ejecutar(FeignCallable<T> llamada) {
        try {
            return llamada.llamar();
        } catch (FeignException exception) {
            throw unavailable(exception);
        }
    }

    private void ejecutarSinRespuesta(FeignCallable<Void> llamada) {
        ejecutar(llamada);
    }

    private ResponseStatusException unavailable(FeignException exception) {
        int status = exception.status();
        String payload = exception.contentUTF8();
        log.warn("Servicio interno respondió {}: {}", status, payload);
        try {
            return new ResponseStatusException(
                    HttpStatus.valueOf(status),
                    extractDownstreamMessage(payload, HttpStatus.valueOf(status)),
                    exception);
        } catch (IllegalArgumentException ex) {
            return new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "El servicio interno respondió un código no HTTP: " + status, exception);
        }
    }

    /**
     * Los microservicios devuelven sus errores como JSON con la forma
     * {timestamp, status, error, message}. Extraemos el mensaje legible para
     * no propagar el JSON crudo hasta el frontend; si el cuerpo no es JSON
     * (o no trae mensaje) se conserva el texto recibido.
     */
    private String extractDownstreamMessage(String payload, HttpStatus status) {
        if (payload == null || payload.isBlank()) {
            return "El servicio interno respondió " + status.value();
        }
        try {
            JsonNode node = MAPPER.readTree(payload);
            if (node.isObject() && node.hasNonNull("message")) {
                String message = node.get("message").asText();
                if (!message.isBlank()) {
                    return message;
                }
            }
        } catch (RuntimeException ignored) {
            // Cuerpo no-JSON o inválido: se propaga el texto recibido sin procesar.
        }
        return payload;
    }

    /* ── Métodos adicionales para compatibilidad con ApiController ─────── */

    public JsonNode buscarUsuarioPorKeycloakId(UUID keycloakId, String email, String nombre,
            String apellido, String rol) {
        return ejecutar(() -> usuarios.buscarPorKeycloakId(keycloakId, email, nombre, apellido, rol));
    }

    public JsonNode obtenerMiPerfil(UUID usuarioId, UUID keycloakId) {
        return ejecutar(() -> profesionales.miPerfil(usuarioId, keycloakId));
    }

    public JsonNode listarResumenCalificaciones() {
        return ejecutar(() -> solicitudes.listarResumenCalificaciones());
    }

    public JsonNode reputacionDe(UUID profesionalId) {
        return ejecutar(() -> solicitudes.reputacionDe(profesionalId));
    }

    public JsonNode suspenderUsuario(UUID id) {
        return ejecutar(() -> usuarios.suspender(id));
    }

    public JsonNode reactivarUsuario(UUID id) {
        return ejecutar(() -> usuarios.reactivar(id));
    }

    public JsonNode vincularProfesional(JsonNode body) {
        return ejecutar(() -> profesionales.vincular(body));
    }

    public JsonNode listarSolicitudes(UUID usuarioId, List<UUID> aliasIds, String tipo, String rol) {
        return ejecutar(() -> solicitudes.listarPropias(usuarioId, aliasIds, tipo, rol));
    }

    public JsonNode actualizarDisponibilidad(UUID id, List<JsonNode> body) {
        return ejecutar(() -> profesionales.actualizarDisponibilidad(id, body));
    }

    public JsonNode listarMensajes(UUID solicitudId, UUID usuarioId, UUID keycloakId) {
        return ejecutar(() -> solicitudes.listarMensajes(solicitudId, usuarioId, keycloakId));
    }

    public JsonNode enviarMensaje(UUID solicitudId, JsonNode body) {
        return ejecutar(() -> solicitudes.enviarMensaje(solicitudId, body));
    }

    public JsonNode crearCalificacion(UUID solicitudId, JsonNode body) {
        return ejecutar(() -> solicitudes.crearCalificacion(solicitudId, body));
    }

    public JsonNode obtenerCalificacion(UUID solicitudId) {
        return ejecutar(() -> solicitudes.obtenerCalificacion(solicitudId));
    }

    public JsonNode buscarProfesionalPorIdOUsuario(UUID id) {
        try {
            return ejecutar(() -> profesionales.buscarPorId(id));
        } catch (ResponseStatusException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                var resultado = ejecutar(() -> profesionales.listarPorUsuarioIds(List.of(id)));
                return resultado;
            }
            throw e;
        }
    }
}

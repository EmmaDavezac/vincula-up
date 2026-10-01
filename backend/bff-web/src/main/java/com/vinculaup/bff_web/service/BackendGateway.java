package com.vinculaup.bff_web.service;

import tools.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import org.springframework.http.client.JdkClientHttpRequestFactory;

@Service
public class BackendGateway {

    private static final Logger log = LoggerFactory.getLogger(BackendGateway.class);

    private final RestClient usuarios;
    private final RestClient profesionales;
    private final RestClient solicitudes;

    public BackendGateway(
            @Value("${usuarios.url}") String usuariosUrl,
            @Value("${profesionales.url}") String profesionalesUrl,
            @Value("${solicitudes.url}") String solicitudesUrl) {
        var factory = new JdkClientHttpRequestFactory();
        this.usuarios = RestClient.builder().requestFactory(factory).baseUrl(usuariosUrl).build();
        this.profesionales = RestClient.builder().requestFactory(factory).baseUrl(profesionalesUrl).build();
        this.solicitudes = RestClient.builder().requestFactory(factory).baseUrl(solicitudesUrl).build();
    }

    public JsonNode listarProfesionales(String estado, Boolean todos) {
        if (Boolean.TRUE.equals(todos)) {
            return get(profesionales, "/profesionales", "todos", "true");
        }
        return get(profesionales, "/profesionales", estado == null ? null : "estado", estado);
    }

    public JsonNode crearProfesional(JsonNode body) {
        return post(profesionales, "/profesionales", body);
    }

    public JsonNode crearEspecialidad(JsonNode body) { return post(profesionales, "/especialidades", body); }
    public JsonNode actualizarEspecialidad(UUID id, JsonNode body) { return put(profesionales, "/especialidades/{id}", body, id); }
    public void eliminarEspecialidad(UUID id) { delete(profesionales, "/especialidades/{id}", id); }
    public JsonNode actualizarProfesional(UUID id, JsonNode body) { return put(profesionales, "/profesionales/{id}", body, id); }
    public JsonNode crearUsuario(JsonNode body) { return post(usuarios, "/usuarios", body); }
    public JsonNode actualizarUsuario(UUID id, JsonNode body) { return patch(usuarios, "/usuarios/{id}", body, id); }
    public void eliminarUsuario(UUID id) { delete(usuarios, "/usuarios/{id}", id); }

    private void delete(RestClient client, String path, UUID id) {
        try {
            client.delete().uri(path, id).retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    public JsonNode listarEspecialidades() {
        return get(profesionales, "/especialidades", null, null);
    }

    public JsonNode buscarUsuarioPorKeycloakId(UUID keycloakId, String email, String nombre, String apellido, String rol) {
        try {
            JsonNode user = usuarios.get().uri(uriBuilder -> {
                var builder = uriBuilder.path("/usuarios/por-keycloak")
                        .queryParam("keycloakId", keycloakId.toString());
                if (email != null && !email.isBlank()) builder.queryParam("email", email.trim());
                if (nombre != null && !nombre.isBlank()) builder.queryParam("nombre", nombre.trim());
                if (apellido != null && !apellido.isBlank()) builder.queryParam("apellido", apellido.trim());
                if (rol != null && !rol.isBlank()) builder.queryParam("rol", rol.trim());
                return builder.build();
            }).retrieve().body(JsonNode.class);

            if (user != null && user.has("id") && keycloakId != null) {
                try {
                    String userRol = user.has("rolNegocio") ? user.get("rolNegocio").asText() : rol;
                    if ("PROFESIONAL".equalsIgnoreCase(userRol) || "PROFESIONAL".equalsIgnoreCase(rol)) {
                        UUID usuarioId = UUID.fromString(user.get("id").asText());
                        Map<String, Object> body = Map.of("usuarioId", usuarioId, "keycloakId", keycloakId);
                        profesionales.post().uri("/profesionales/vincular").body(body).retrieve().toBodilessEntity();
                    }
                } catch (Exception ignored) {
                }
            }

            return user;
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    public JsonNode listarUsuarios(String rol, String estado) {
        try {
            return usuarios.get().uri(uriBuilder -> {
                var builder = uriBuilder.path("/usuarios");
                if (rol != null && !rol.isBlank()) {
                    builder.queryParam("rol", rol.trim());
                }
                if (estado != null && !estado.isBlank()) {
                    builder.queryParam("estado", estado.trim());
                }
                return builder.build();
            }).retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    /** Búsqueda por email: devuelve {@code null} cuando no existe (404 esperado). */
    public JsonNode buscarUsuarioPorEmail(String email) {
        try {
            return usuarios.get().uri(uriBuilder -> uriBuilder.path("/usuarios/por-email")
                    .queryParam("email", email)
                    .build()).retrieve().toEntity(JsonNode.class).getBody();
        } catch (org.springframework.web.client.HttpStatusCodeException notFound) {
            if (notFound.getStatusCode().value() == 404) {
                return null;
            }
            throw unavailable(notFound);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    /** Registra la aceptación de los términos. El id sale del token, no del body. */
    public JsonNode aceptarTerminos(UUID id, String version) {
        var body = tools.jackson.databind.json.JsonMapper.builder().build().createObjectNode();
        body.put("version", version);
        return patch(usuarios, "/usuarios/{id}/terminos", body, id);
    }

    /** Baneo administrativo de la cuenta (reversible). */
    public JsonNode suspenderUsuario(UUID id) {
        return patch(usuarios, "/usuarios/{id}/suspender", null, id);
    }

    public JsonNode reactivarUsuario(UUID id) {
        return patch(usuarios, "/usuarios/{id}/reactivar", null, id);
    }

    public JsonNode buscarUsuarioPorId(UUID id) {
        return get(usuarios, "/usuarios/{id}", null, null, id);
    }

    /**
     * Busca un perfil profesional por id de perfil o, si no existe con ese id,
     * por id de usuario: el frontend guarda el {@code usuarioId} del profesional
     * en la solicitud, y ambos identificadores circulan según la versión con la
     * que se creó el pedido. Devuelve {@code null} si no se encuentra de ninguna
     * de las dos formas (la tarjeta del profesional se muestra con genéricos).
     */
    public JsonNode buscarProfesionalPorIdOUsuario(UUID id) {
        try {
            return get(profesionales, "/profesionales/{id}", null, null, id);
        } catch (ResponseStatusException notFound) {
            if (notFound.getStatusCode().value() != 404) {
                throw notFound;
            }
        }
        try {
            JsonNode lista = get(profesionales, "/profesionales/por-usuario", "usuarioIds", id.toString());
            return lista != null && lista.isArray() && !lista.isEmpty() ? lista.get(0) : null;
        } catch (RestClientException ignored) {
            return null;
        }
    }

    public JsonNode activarProfesional(JsonNode body) {
        return patch(profesionales, "/profesionales/activar", body);
    }

    public JsonNode suspenderProfesional(UUID id) {
        return patch(profesionales, "/profesionales/{id}/suspender", null, id);
    }

    public JsonNode reactivarProfesional(UUID id) {
        return patch(profesionales, "/profesionales/{id}/reactivar", null, id);
    }

    public JsonNode actualizarDisponibilidad(UUID id, JsonNode body) {
        return put(profesionales, "/profesionales/{id}/disponibilidad", body, id);
    }

    public JsonNode listarDisponibilidad(UUID id) {
        return get(profesionales, "/profesionales/{id}/disponibilidad", null, null, id);
    }

    public JsonNode vincularProfesional(JsonNode body) {
        return post(profesionales, "/profesionales/vincular", body);
    }

    public ResponseEntity<JsonNode> obtenerMiPerfil(UUID usuarioId, UUID keycloakId) {
        try {
            return profesionales.get().uri(uriBuilder -> {
                var builder = uriBuilder.path("/profesionales/mi-perfil")
                        .queryParam("usuarioId", usuarioId);
                if (keycloakId != null) {
                    builder.queryParam("keycloakId", keycloakId);
                }
                return builder.build();
            }).retrieve().toEntity(JsonNode.class);
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    public JsonNode crearSolicitud(JsonNode body) {
        return post(solicitudes, "/solicitudes", body);
    }

    public JsonNode listarSolicitudes(UUID usuarioId, List<UUID> aliasIds, String tipo, String rol) {
        try {
            return solicitudes.get().uri(uriBuilder -> {
                var builder = uriBuilder.path("/solicitudes/mias")
                        .queryParam("usuarioId", usuarioId);
                if (aliasIds != null && !aliasIds.isEmpty()) {
                    for (UUID alias : aliasIds) {
                        if (alias != null) builder.queryParam("aliasIds", alias);
                    }
                }
                if (tipo != null && !tipo.isBlank()) builder.queryParam("tipo", tipo);
                if (rol != null && !rol.isBlank()) builder.queryParam("rol", rol);
                return builder.build();
            }).retrieve().body(JsonNode.class);
        } catch (RestClientException ex) {
            throw unavailable(ex);
        }
    }

    public JsonNode listarSolicitudes(UUID usuarioId) {
        return listarSolicitudes(usuarioId, List.of(), null, null);
    }

    /**
     * Solicitudes de toda la plataforma para los indicadores del panel de administración.
     * Sólo la usa el endpoint de administración del BFF, que exige rol ADMIN.
     */
    public JsonNode listarSolicitudesParaPanel() {
        return get(solicitudes, "/solicitudes/panel", null, null);
    }

    /**
     * Reputación de los profesionales (promedio y cantidad de reseñas). La
     * calcula vive en ms-solicitudes, que es donde están las calificaciones.
     */
    public JsonNode listarResumenCalificaciones() {
        return get(solicitudes, "/calificaciones", null, null);
    }

    /** Reseñas recibidas por un profesional, con el detalle. */
    public JsonNode reputacionDe(UUID profesionalId) {
        return get(solicitudes, "/calificaciones/profesional/{profesionalId}", null, null, profesionalId);
    }

    public JsonNode aceptarSolicitud(UUID id, JsonNode body) {
        return patch(solicitudes, "/solicitudes/{id}/aceptar", body, id);
    }

    public JsonNode rechazarSolicitud(UUID id, JsonNode body) {
        return patch(solicitudes, "/solicitudes/{id}/rechazar", body, id);
    }

    public JsonNode completarSolicitud(UUID id, JsonNode body) {
        return patch(solicitudes, "/solicitudes/{id}/completar", body, id);
    }

    public JsonNode cancelarSolicitud(UUID id, JsonNode body) {
        return patch(solicitudes, "/solicitudes/{id}/cancelar", body, id);
    }

    /**
     * Mensajes de una solicitud. El BFF resuelve la identidad desde el token y envía el
     * {@code keycloakId} como alias para reconocer al usuario en las solicitudes históricas.
     */
    public JsonNode listarMensajes(UUID solicitudId, UUID usuarioId, UUID keycloakId) {
        try {
            return solicitudes.get().uri(uriBuilder -> {
                var builder = uriBuilder.path("/solicitudes/{id}/mensajes")
                        .queryParam("usuarioId", usuarioId);
                if (keycloakId != null) {
                    builder.queryParam("keycloakId", keycloakId);
                }
                return builder.build(solicitudId);
            }).retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    public JsonNode enviarMensaje(UUID solicitudId, JsonNode body) {
        return post(solicitudes, "/solicitudes/{id}/mensajes", body, solicitudId);
    }

    public JsonNode crearCalificacion(UUID solicitudId, JsonNode body) {
        return post(solicitudes, "/solicitudes/{id}/calificacion", body, solicitudId);
    }

    public JsonNode obtenerCalificacion(UUID solicitudId) {
        return get(solicitudes, "/solicitudes/{id}/calificacion", null, null, solicitudId);
    }

    /**
     * Geocodifica una dirección. Delega en ms-solicitudes, que es donde vive la
     * única implementación de Nominatim (con su caché).
     * <p>
     * Si el microservicio no responde se devuelve un resultado con
     * {@code resolved: false} en vez de cortar con 502: el cliente puede seguir
     * con el mapa interactivo, y una falla del backend de solicitudes no debe
     * dejar sin geocodificar a toda la app.
     */
    public Map<String, Object> geocodificar(String direccion) {
        String normalizada = direccion == null ? "" : direccion.trim();
        if (normalizada.isEmpty()) {
            return sinResolver("", "empty-query",
                    "Dirección vacía. Escribí una calle, altura y ciudad.");
        }
        try {
            JsonNode nodo = get(solicitudes, "/solicitudes/geocodificar", "direccion", normalizada);
            Map<String, Object> response = new HashMap<>();
            nodo.properties().forEach(entry -> response.put(entry.getKey(),
                    entry.getValue().isNull() ? null : entry.getValue().asText()));
            response.put("latitude", nodo.path("latitude").isNumber() ? nodo.get("latitude").asDouble() : null);
            response.put("longitude", nodo.path("longitude").isNumber() ? nodo.get("longitude").asDouble() : null);
            response.put("latitud", response.get("latitude"));
            response.put("longitud", response.get("longitude"));
            response.put("resolved", nodo.path("resolved").asBoolean(false));
            return response;
        } catch (RuntimeException ex) {
            log.warn("ms-solicitudes no respondió la geocodificación de '{}': {}", normalizada, ex.getMessage());
            return sinResolver(normalizada, "servicio-no-disponible",
                    "El servicio de mapas no está disponible en este momento. "
                            + "Probá de nuevo o usá el mapa interactivo.");
        }
    }

    /**
     * Respuesta de geocodificación sin coordenadas. Va en un HashMap y no en
     * {@code Map.of} porque las coordenadas sin resolver son {@code null}, y
     * {@code Map.of} no admite valores nulos.
     */
    private Map<String, Object> sinResolver(String direccion, String source, String error) {
        Map<String, Object> response = new HashMap<>();
        response.put("address", direccion);
        response.put("resolved", false);
        response.put("latitude", null);
        response.put("longitude", null);
        response.put("latitud", null);
        response.put("longitud", null);
        response.put("source", source);
        response.put("error", error);
        return response;
    }

    private JsonNode get(RestClient client, String path, String queryName, String queryValue, Object... pathVariables) {
        try {
            RestClient.RequestHeadersSpec<?> request = client.get().uri(uriBuilder -> {
                var builder = uriBuilder.path(path);
                if (queryName != null) {
                    builder.queryParam(queryName, queryValue);
                }
                return builder.build(pathVariables);
            });
            return request.retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private JsonNode post(RestClient client, String path, JsonNode body, Object... pathVariables) {
        try {
            RestClient.RequestBodySpec spec = client.post().uri(path, pathVariables);
            if (body != null && !body.isNull() && !body.isMissingNode()) {
                spec.body(body);
            }
            return spec.retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private JsonNode put(RestClient client, String path, JsonNode body, Object... pathVariables) {
        try {
            RestClient.RequestBodySpec spec = client.put().uri(path, pathVariables);
            if (body != null && !body.isNull() && !body.isMissingNode()) {
                spec.body(body);
            }
            return spec.retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private JsonNode patch(RestClient client, String path, JsonNode body, Object... pathVariables) {
        try {
            RestClient.RequestBodySpec spec = client.patch().uri(path, pathVariables);
            if (body != null && !body.isNull() && !body.isMissingNode()) {
                spec.body(body);
            }
            return spec.retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private ResponseStatusException unavailable(RestClientException exception) {
        if (exception instanceof org.springframework.web.client.HttpStatusCodeException httpEx) {
            String payload = httpEx.getResponseBodyAsString();
            log.warn("Servicio interno respondió {}: {}", httpEx.getStatusCode(), payload);
            return new ResponseStatusException(
                    httpEx.getStatusCode(), extractDownstreamMessage(payload, httpEx.getStatusCode()), exception);
        }
        org.slf4j.LoggerFactory.getLogger(BackendGateway.class)
                .error("No se pudo contactar un servicio interno: {}", exception.getMessage());
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo contactar un servicio interno", exception);
    }

    /**
     * Los microservicios devuelven sus errores como JSON con la forma
     * {timestamp, status, error, message}. Extraemos el mensaje legible para
     * no propagar el JSON crudo hasta el frontend; si el cuerpo no es JSON
     * (o no trae mensaje) se conserva el texto recibido.
     */
    private String extractDownstreamMessage(String payload, org.springframework.http.HttpStatusCode status) {
        if (payload == null || payload.isBlank()) {
            return "El servicio interno respondió " + status.value();
        }
        try {
            JsonNode node = tools.jackson.databind.json.JsonMapper.builder().build().readTree(payload);
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
}
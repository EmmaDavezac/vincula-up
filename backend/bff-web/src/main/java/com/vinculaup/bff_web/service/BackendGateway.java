package com.vinculaup.bff_web.service;

import tools.jackson.databind.JsonNode;
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
    public void eliminarProfesional(UUID id) { delete(profesionales, "/profesionales/{id}", id); }
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

    public JsonNode listarUsuarios(String rol) {
        return get(usuarios, "/usuarios", rol == null ? null : "rol", rol);
    }

    public JsonNode buscarUsuarioPorId(UUID id) {
        return get(usuarios, "/usuarios/{id}", null, null, id);
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

    public JsonNode listarMensajes(UUID solicitudId, UUID usuarioId) {
        return get(solicitudes, "/solicitudes/{id}/mensajes", "usuarioId", usuarioId.toString(), solicitudId);
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
            org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(BackendGateway.class);
            log.warn("Servicio interno respondió {}: {}", httpEx.getStatusCode(), payload);
            String message = (payload == null || payload.isBlank())
                    ? "El servicio interno respondió " + httpEx.getStatusCode()
                    : payload;
            return new ResponseStatusException(httpEx.getStatusCode(), message, exception);
        }
        org.slf4j.LoggerFactory.getLogger(BackendGateway.class)
                .error("No se pudo contactar un servicio interno: {}", exception.getMessage());
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo contactar un servicio interno", exception);
    }
}

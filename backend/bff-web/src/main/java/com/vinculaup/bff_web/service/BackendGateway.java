package com.vinculaup.bff_web.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class BackendGateway {

    private final RestClient usuarios;
    private final RestClient profesionales;
    private final RestClient solicitudes;

    public BackendGateway(
            @Value("${usuarios.url}") String usuariosUrl,
            @Value("${profesionales.url}") String profesionalesUrl,
            @Value("${solicitudes.url}") String solicitudesUrl) {
        this.usuarios = RestClient.builder().baseUrl(usuariosUrl).build();
        this.profesionales = RestClient.builder().baseUrl(profesionalesUrl).build();
        this.solicitudes = RestClient.builder().baseUrl(solicitudesUrl).build();
    }

    public JsonNode listarProfesionales(String estado) {
        return get(profesionales, "/profesionales", estado == null ? null : "estado", estado);
    }

    public JsonNode crearProfesional(JsonNode body) {
        return post(profesionales, "/profesionales", body);
    }

    public JsonNode listarEspecialidades() {
        return get(profesionales, "/especialidades", null, null);
    }

    public JsonNode buscarUsuarioPorKeycloakId(UUID keycloakId) {
        return get(usuarios, "/usuarios/por-keycloak", "keycloakId", keycloakId.toString());
    }

    public JsonNode activarProfesional(JsonNode body) {
        return patch(profesionales, "/profesionales/activar", body);
    }

    public JsonNode suspenderProfesional(UUID id) {
        return patch(profesionales, "/profesionales/{id}/suspender", null, id);
    }

    public JsonNode crearSolicitud(JsonNode body) {
        return post(solicitudes, "/solicitudes", body);
    }

    public JsonNode listarSolicitudes(UUID usuarioId) {
        return get(solicitudes, "/solicitudes/mias", "usuarioId", usuarioId.toString());
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

    public JsonNode listarMensajes(UUID solicitudId, UUID usuarioId) {
        return get(solicitudes, "/solicitudes/{id}/mensajes", "usuarioId", usuarioId.toString(), solicitudId);
    }

    public JsonNode enviarMensaje(UUID solicitudId, JsonNode body) {
        return post(solicitudes, "/solicitudes/{id}/mensajes", body, solicitudId);
    }

    public JsonNode crearCalificacion(UUID solicitudId, JsonNode body) {
        return post(solicitudes, "/solicitudes/{id}/calificacion", body, solicitudId);
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
            return client.post().uri(path, pathVariables).body(body).retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private JsonNode patch(RestClient client, String path, JsonNode body, Object... pathVariables) {
        try {
            return client.patch().uri(path, pathVariables).body(body).retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            throw unavailable(exception);
        }
    }

    private ResponseStatusException unavailable(RestClientException exception) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo contactar un servicio interno", exception);
    }
}

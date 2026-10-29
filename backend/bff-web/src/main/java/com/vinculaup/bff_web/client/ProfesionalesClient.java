package com.vinculaup.bff_web.client;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.JsonNode;

/**
 * Cliente REST hacia ms-profesionales. Usa {@link RestClient} (nativo de Spring Boot 4.x)
 * en lugar de OpenFeign, que no es compatible con Spring Boot 4.1.1.
 */
@Component
public class ProfesionalesClient {

    private final RestClient restClient;

    public ProfesionalesClient(@Value("${profesionales.url}") String baseUrl) {
        ClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory() {
            @Override
            public ClientHttpRequest createRequest(URI url, HttpMethod method) throws IOException {
                ClientHttpRequest request = super.createRequest(url, method);
                ServletRequestAttributes attrs =
                        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null) {
                    String auth = attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
                    if (auth != null && !auth.isBlank()) {
                        request.getHeaders().add(HttpHeaders.AUTHORIZATION, auth);
                    }
                }
                return request;
            }
        };

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public JsonNode listar(String estado, Boolean todos) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/profesionales");
                    if (estado != null && !estado.isBlank()) {
                        builder.queryParam("estado", estado);
                    }
                    if (todos != null) {
                        builder.queryParam("todos", todos);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode crear(JsonNode body) {
        return restClient.post()
                .uri("/profesionales")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode buscarPorId(UUID id) {
        return restClient.get()
                .uri("/profesionales/{id}", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode listarPorUsuarioIds(List<UUID> usuarioIds) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/profesionales/por-usuario");
                    if (usuarioIds != null && !usuarioIds.isEmpty()) {
                        builder.queryParam("usuarioIds", usuarioIds);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode miPerfil(UUID usuarioId, UUID keycloakId) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .path("/profesionales/mi-perfil")
                            .queryParam("usuarioId", usuarioId);
                    if (keycloakId != null) {
                        builder.queryParam("keycloakId", keycloakId);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode vincular(JsonNode body) {
        return restClient.post()
                .uri("/profesionales/vincular")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode activarPorUsuario(JsonNode body) {
        return restClient.patch()
                .uri("/profesionales/activar")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode activar(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/profesionales/{id}/activar", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode suspender(UUID id) {
        return restClient.patch()
                .uri("/profesionales/{id}/suspender", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode reactivar(UUID id) {
        return restClient.patch()
                .uri("/profesionales/{id}/reactivar", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode listarEspecialidades() {
        return restClient.get()
                .uri("/especialidades")
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode crearEspecialidad(JsonNode body) {
        return restClient.post()
                .uri("/especialidades")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode actualizarEspecialidad(UUID id, JsonNode body) {
        return restClient.put()
                .uri("/especialidades/{id}", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public void eliminarEspecialidad(UUID id) {
        restClient.delete()
                .uri("/especialidades/{id}", id)
                .retrieve()
                .toBodilessEntity();
    }

    public JsonNode actualizarProfesional(UUID id, JsonNode body) {
        return restClient.put()
                .uri("/profesionales/{id}", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode listarDisponibilidad(UUID profesionalId) {
        return restClient.get()
                .uri("/profesionales/{profesionalId}/disponibilidad", profesionalId)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode reemplazarDisponibilidad(UUID profesionalId, List<JsonNode> requests) {
        return restClient.put()
                .uri("/profesionales/{profesionalId}/disponibilidad", profesionalId)
                .body(requests)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode actualizarDisponibilidad(UUID id, List<JsonNode> requests) {
        return restClient.put()
                .uri("/profesionales/{id}/disponibilidad", id)
                .body(requests)
                .retrieve()
                .body(JsonNode.class);
    }

}

package com.vinculaup.bff_web.client;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.JsonNode;

/**
 * Cliente REST hacia ms-usuarios. Usa {@link RestClient} (nativo de Spring Boot 4.x)
 * en lugar de OpenFeign, que no es compatible con Spring Boot 4.1.1.
 * <p>
 * Reenvía el encabezado {@code Authorization} (JWT de Keycloak) de la petición
 * entrante hacia ms-usuarios, mediante un {@link ClientHttpRequestFactory} personalizado.
 */
@Component
public class UsuariosClient {

    private final RestClient restClient;

    public UsuariosClient(@Value("${usuarios.url}") String baseUrl) {
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

    public JsonNode listar(String rol, String estado) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .queryParam(rol != null ? "rol" : null, rol)
                        .queryParam(estado != null ? "estado" : null, estado)
                        .build())
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode crear(JsonNode body) {
        return restClient.post()
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode buscarPorEmail(String email) {
        return restClient.get()
                .uri("/por-email?email={email}", email)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode aceptarTerminos(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/{id}/terminos", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode buscarPorId(UUID id) {
        return restClient.get()
                .uri("/{id}", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode vincularKeycloak(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/{id}/keycloak", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode suspender(UUID id) {
        return restClient.patch()
                .uri("/{id}/suspender", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode reactivar(UUID id) {
        return restClient.patch()
                .uri("/{id}/reactivar", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode buscarPorKeycloakId(UUID keycloakId, String email, String nombre,
            String apellido, String rol) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/por-keycloak")
                        .queryParam("keycloakId", keycloakId)
                        .queryParam("email", email)
                        .queryParam("nombre", nombre)
                        .queryParam("apellido", apellido)
                        .queryParam("rol", rol)
                        .build())
                .retrieve()
                .body(JsonNode.class);
    }

    public void eliminar(UUID id) {
        restClient.delete()
                .uri("/{id}", id)
                .retrieve()
                .toBodilessEntity();
    }

    public JsonNode actualizar(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/{id}", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }
}
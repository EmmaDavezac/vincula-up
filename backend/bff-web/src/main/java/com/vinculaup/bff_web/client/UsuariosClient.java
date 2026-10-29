package com.vinculaup.bff_web.client;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.vinculaup.bff_web.config.JdkHttpClientRequestFactory;

import tools.jackson.databind.JsonNode;

/**
 * Cliente REST hacia ms-usuarios. Usa {@link RestClient} (nativo de Spring Boot 4.x)
 * en lugar de OpenFeign, que no es compatible con Spring Boot 4.1.1.
 * <p>
 * Las peticiones hacia ms-usuarios se envían mediante {@link JdkHttpClientRequestFactory},
 * una fábrica basada en {@link java.net.http.HttpClient} que soporta el método PATCH
 * y reenvía el encabezado {@code Authorization} (JWT de Keycloak) de la petición entrante.
 */
@Component
public class UsuariosClient {

    private final RestClient restClient;

    public UsuariosClient(@Value("${usuarios.url}") String baseUrl,
            JdkHttpClientRequestFactory requestFactory) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public JsonNode listar(String rol, String estado) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/usuarios");
                    if (rol != null && !rol.isBlank()) {
                        builder.queryParam("rol", rol);
                    }
                    if (estado != null && !estado.isBlank()) {
                        builder.queryParam("estado", estado);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode crear(JsonNode body) {
        return restClient.post()
                .uri("/usuarios")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode buscarPorEmail(String email) {
        return restClient.get()
                .uri("/usuarios/por-email?email={email}", email)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode aceptarTerminos(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/usuarios/{id}/terminos", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode buscarPorId(UUID id) {
        return restClient.get()
                .uri("/usuarios/{id}", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode vincularKeycloak(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/usuarios/{id}/keycloak", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode suspender(UUID id) {
        return restClient.patch()
                .uri("/usuarios/{id}/suspender", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode reactivar(UUID id) {
        return restClient.patch()
                .uri("/usuarios/{id}/reactivar", id)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode buscarPorKeycloakId(UUID keycloakId, String email, String nombre,
            String apellido, String rol) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .path("/usuarios/por-keycloak")
                            .queryParam("keycloakId", keycloakId);
                    if (email != null && !email.isBlank()) {
                        builder.queryParam("email", email);
                    }
                    if (nombre != null && !nombre.isBlank()) {
                        builder.queryParam("nombre", nombre);
                    }
                    if (apellido != null && !apellido.isBlank()) {
                        builder.queryParam("apellido", apellido);
                    }
                    if (rol != null && !rol.isBlank()) {
                        builder.queryParam("rol", rol);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public void eliminar(UUID id) {
        restClient.delete()
                .uri("/usuarios/{id}", id)
                .retrieve()
                .toBodilessEntity();
    }

    public JsonNode actualizar(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/usuarios/{id}", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }
}
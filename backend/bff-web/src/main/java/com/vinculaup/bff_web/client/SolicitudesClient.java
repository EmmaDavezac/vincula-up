package com.vinculaup.bff_web.client;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.vinculaup.bff_web.config.JdkHttpClientRequestFactory;

import tools.jackson.databind.JsonNode;

/**
 * Cliente REST hacia ms-solicitudes. Usa {@link RestClient} (nativo de Spring Boot 4.x)
 * en lugar de OpenFeign, que no es compatible con Spring Boot 4.1.1.
 * <p>
 * Las peticiones hacia ms-solicitudes se envían mediante {@link JdkHttpClientRequestFactory},
 * una fábrica basada en {@link java.net.http.HttpClient} que soporta el método PATCH
 * y reenvía el encabezado {@code Authorization} (JWT de Keycloak) de la petición entrante.
 */
@Component
public class SolicitudesClient {

    private final RestClient restClient;

    public SolicitudesClient(@Value("${solicitudes.url}") String baseUrl,
            JdkHttpClientRequestFactory requestFactory) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public JsonNode geocodificar(String direccion) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder.path("/solicitudes/geocodificar");
                    if (direccion != null && !direccion.isBlank()) {
                        builder.queryParam("direccion", direccion);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode crear(JsonNode body) {
        return restClient.post()
                .uri("/solicitudes")
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode listarParaPanel() {
        return restClient.get()
                .uri("/solicitudes/panel")
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode listarPropias(UUID usuarioId, List<UUID> aliasIds, String tipo, String rol) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .path("/solicitudes/mias")
                            .queryParam("usuarioId", usuarioId);
                    if (aliasIds != null && !aliasIds.isEmpty()) {
                        builder.queryParam("aliasIds", aliasIds);
                    }
                    if (tipo != null && !tipo.isBlank()) {
                        builder.queryParam("tipo", tipo);
                    }
                    if (rol != null && !rol.isBlank()) {
                        builder.queryParam("rol", rol);
                    }
                    return builder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode aceptar(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/solicitudes/{id}/aceptar", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode rechazar(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/solicitudes/{id}/rechazar", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode completar(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/solicitudes/{id}/completar", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode cancelar(UUID id, JsonNode body) {
        return restClient.patch()
                .uri("/solicitudes/{id}/cancelar", id)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode listarMensajes(UUID solicitudId, UUID usuarioId, UUID keycloakId) {
        return restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .path("/solicitudes/{solicitudId}/mensajes")
                            .queryParam("usuarioId", usuarioId);
                    if (keycloakId != null) {
                        builder.queryParam("keycloakId", keycloakId);
                    }
                    return builder.build(solicitudId);
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode enviarMensaje(UUID solicitudId, JsonNode body) {
        return restClient.post()
                .uri("/solicitudes/{solicitudId}/mensajes", solicitudId)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode crearCalificacion(UUID solicitudId, JsonNode body) {
        return restClient.post()
                .uri("/solicitudes/{solicitudId}/calificacion", solicitudId)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode obtenerCalificacion(UUID solicitudId) {
        return restClient.get()
                .uri("/solicitudes/{solicitudId}/calificacion", solicitudId)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode listarResumenCalificaciones() {
        return restClient.get()
                .uri("/calificaciones")
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode reputacionDe(UUID profesionalId) {
        return restClient.get()
                .uri("/calificaciones/profesional/{profesionalId}", profesionalId)
                .retrieve()
                .body(JsonNode.class);
    }

}

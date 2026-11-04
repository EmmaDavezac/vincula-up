package com.vinculaup.ms_solicitudes.client;

import java.io.IOException;
import java.net.URI;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Cliente REST hacia ms-profesionales. Usa {@link RestClient} (nativo de Spring Boot 4.x)
 * en lugar de OpenFeign, que no es compatible con Spring Boot 4.1.1.
 * <p>
 * Reenvía el encabezado {@code Authorization} (JWT de Keycloak) de la petición
 * entrante hacia ms-profesionales, mediante un {@link ClientHttpRequestFactory} personalizado.
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

    public List<DisponibilidadProfesional> obtenerDisponibilidad(UUID id) {
        return restClient.get()
                .uri("/profesionales/{id}/disponibilidad", id)
                .retrieve()
                .body(new ParameterizedTypeReference<List<DisponibilidadProfesional>>() {});
    }

    public List<ProfesionalIdentidad> obtenerIdentidades(Collection<UUID> usuarioIds) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/profesionales/por-usuario")
                        .queryParam("usuarioIds", usuarioIds)
                        .build())
                .retrieve()
                .body(new ParameterizedTypeReference<List<ProfesionalIdentidad>>() {});
    }

    public Optional<ProfesionalIdentidad> obtenerPorId(UUID id) {
        try {
            ProfesionalIdentidad result = restClient.get()
                    .uri("/profesionales/{id}", id)
                    .retrieve()
                    .body(ProfesionalIdentidad.class);
            return Optional.ofNullable(result);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                return Optional.empty();
            }
            throw e;
        }
    }

    public Optional<ProfesionalIdentidad> obtenerPorIdentidad(UUID identidad) {
        if (identidad == null) {
            return Optional.empty();
        }
        return obtenerPorId(identidad);
    }
}

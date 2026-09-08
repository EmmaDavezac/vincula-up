package com.vinculaup.ms_solicitudes.client;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class ProfesionalesClient {

    private final RestClient restClient;

    public ProfesionalesClient(@Value("${profesionales.url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public List<DisponibilidadProfesional> obtenerDisponibilidad(UUID profesionalId) {
        try {
            DisponibilidadProfesional[] response = restClient.get()
                    .uri("/profesionales/{id}/disponibilidad", profesionalId)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, result) -> {
                        throw new IllegalStateException("No se pudo consultar la disponibilidad del profesional");
                    })
                    .body(DisponibilidadProfesional[].class);
            return response == null ? List.of() : Arrays.asList(response);
        } catch (RestClientException | IllegalStateException exception) {
            throw new IllegalStateException("No se pudo consultar la disponibilidad del profesional", exception);
        }
    }
}

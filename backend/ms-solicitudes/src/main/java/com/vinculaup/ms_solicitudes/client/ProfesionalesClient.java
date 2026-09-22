package com.vinculaup.ms_solicitudes.client;

import java.util.Arrays;
import java.util.Collection;
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

    public List<ProfesionalIdentidad> obtenerIdentidades(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        try {
            ProfesionalIdentidad[] response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/profesionales/por-usuario")
                            .queryParam("usuarioIds", ids)
                            .build())
                    .retrieve()
                    .body(ProfesionalIdentidad[].class);
            return response == null ? List.of() : Arrays.asList(response);
        } catch (Exception ex) {
            return List.of();
        }
    }

    public java.util.Optional<ProfesionalIdentidad> obtenerPorId(UUID id) {
        if (id == null) {
            return java.util.Optional.empty();
        }
        try {
            ProfesionalIdentidad response = restClient.get()
                    .uri("/profesionales/{id}", id)
                    .retrieve()
                    .body(ProfesionalIdentidad.class);
            return java.util.Optional.ofNullable(response);
        } catch (Exception ex) {
            return java.util.Optional.empty();
        }
    }

    /**
     * Resuelve el perfil profesional por cualquiera de las identidades que usa la aplicación:
     * el id del perfil del padrón o el {@code usuarioId} de ms-usuarios (que es el id con el que
     * el frontend arma las solicitudes). Primero se intenta el camino canónico
     * ({@code /profesionales/{id}}) y, si no hay perfil con ese id, se busca por usuario.
     */
    public java.util.Optional<ProfesionalIdentidad> obtenerPorIdentidad(UUID identidad) {
        if (identidad == null) {
            return java.util.Optional.empty();
        }
        java.util.Optional<ProfesionalIdentidad> porPerfil = obtenerPorId(identidad);
        if (porPerfil.isPresent()) {
            return porPerfil;
        }
        return obtenerIdentidades(List.of(identidad)).stream().findFirst();
    }
}

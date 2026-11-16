package com.vinculaup.bff_web.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class SolicitudPrivacyFilterTest {

    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void ocultaDomicilioYReducePrecisionMientrasLaSolicitudEstaPendiente() {
        var solicitudes = mapper.createArrayNode();
        solicitudes.add(mapper.createObjectNode()
                .put("estado", "PENDIENTE")
                .put("direccionServicio", "Calle 1234")
                .put("zonaAproximada", "Centro")
                .put("latitud", -32.4833)
                .put("longitud", -58.2318));

        var filtradas = SolicitudPrivacyFilter.aplicar(solicitudes, "PROFESIONAL");

        assertEquals("Centro", filtradas.get(0).path("direccionServicio").asText());
        assertEquals(-32.48, filtradas.get(0).path("latitud").asDouble());
        assertEquals(-58.23, filtradas.get(0).path("longitud").asDouble());
        assertEquals("Calle 1234", solicitudes.get(0).path("direccionServicio").asText());
    }

    @Test
    void eliminaDomicilioExactoSiNoHayZonaAproximada() {
        var solicitudes = mapper.createArrayNode();
        solicitudes.add(mapper.createObjectNode()
                .put("estado", "PENDIENTE")
                .put("direccionServicio", "Calle 1234")
                .put("latitud", -32.4833));

        var filtradas = SolicitudPrivacyFilter.aplicar(solicitudes, "PROFESIONAL");

        assertFalse(filtradas.get(0).has("direccionServicio"));
        assertEquals(-32.48, filtradas.get(0).path("latitud").asDouble());
    }

    @Test
    void conservaDomicilioExactoLuegoDeAceptar() {
        var solicitudes = mapper.createArrayNode();
        solicitudes.add(mapper.createObjectNode()
                .put("estado", "ACEPTADA")
                .put("direccionServicio", "Calle 1234")
                .put("latitud", -32.4833));

        var filtradas = SolicitudPrivacyFilter.aplicar(solicitudes, "PROFESIONAL");

        assertEquals("Calle 1234", filtradas.get(0).path("direccionServicio").asText());
        assertEquals(-32.4833, filtradas.get(0).path("latitud").asDouble());
    }

    @Test
    void noModificaLaRespuestaDelCliente() {
        var solicitudes = mapper.createArrayNode();
        solicitudes.add(mapper.createObjectNode()
                .put("estado", "PENDIENTE")
                .put("direccionServicio", "Calle 1234")
                .put("latitud", -32.4833));

        assertSame(solicitudes, SolicitudPrivacyFilter.aplicar(solicitudes, "CLIENTE"));
    }
}

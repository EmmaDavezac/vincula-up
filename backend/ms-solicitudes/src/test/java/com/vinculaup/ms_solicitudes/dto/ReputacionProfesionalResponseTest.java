package com.vinculaup.ms_solicitudes.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class ReputacionProfesionalResponseTest {

    @Test
    void serializaResenasConElNombreDeCampoDelContratoBff() {
        var response = new ReputacionProfesionalResponse(
                4.0,
                1,
                List.of(new ResenaResponse(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        4,
                        "Trabajo correcto",
                        null,
                        UUID.randomUUID())));

        var json = JsonMapper.builder().build().valueToTree(response);

        assertEquals(1, json.path("resenas").size());
        assertFalse(json.has("reseñas"));
    }
}

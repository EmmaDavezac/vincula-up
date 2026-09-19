package com.vinculaup.bff_web;

import com.vinculaup.bff_web.service.BackendGateway;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El listado público de profesionales del BFF debe incluir el nombre y apellido
 * reales (viven en ms-usuarios, no en ms-profesionales) para que el flujo de
 * solicitud muestre la identidad del profesional en vez de un genérico.
 */
@SpringBootTest
class ProfesionalListingTests {
    @Autowired WebApplicationContext context;
    @MockitoBean BackendGateway gateway;
    @MockitoBean JwtDecoder decoder;
    private MockMvc mvc;
    private final JsonMapper mapper = JsonMapper.builder().build();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    private ObjectNode profesional(UUID usuarioId, String legajo) {
        return mapper.createObjectNode()
                .put("id", UUID.randomUUID().toString())
                .put("usuarioId", usuarioId.toString())
                .put("legajo", legajo);
    }

    @Test
    void listingIncludesRealNameAndFallbackPhotoFromUsuarios() throws Exception {
        UUID usuarioId = UUID.randomUUID();
        when(gateway.listarProfesionales("ACTIVO", null))
                .thenReturn(mapper.createArrayNode().add(profesional(usuarioId, "P-2001")));
        when(gateway.buscarUsuarioPorId(usuarioId)).thenReturn(mapper.createObjectNode()
                .put("id", usuarioId.toString())
                .put("nombre", "Luciano")
                .put("apellido", "González")
                .put("fotoUrl", "data:image/png;base64,AAA"));
        mvc.perform(get("/api/profesionales").param("estado", "ACTIVO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nombre").value("Luciano"))
                .andExpect(jsonPath("$[0].apellido").value("González"))
                .andExpect(jsonPath("$[0].fotoUrl").value("data:image/png;base64,AAA"))
                .andExpect(jsonPath("$[0].legajo").value("P-2001"));
        verify(gateway).buscarUsuarioPorId(usuarioId);
    }

    @Test
    void listingKeepsPadronPhotoOverUsuarioPhoto() throws Exception {
        UUID usuarioId = UUID.randomUUID();
        when(gateway.listarProfesionales(null, true)).thenReturn(mapper.createArrayNode().add(
                profesional(usuarioId, "P-2002").put("fotoUrl", "data:image/jpeg;base64,PADRON")));
        when(gateway.buscarUsuarioPorId(usuarioId)).thenReturn(mapper.createObjectNode()
                .put("id", usuarioId.toString())
                .put("nombre", "Luciano")
                .put("apellido", "González")
                .put("fotoUrl", "data:image/jpeg;base64,USUARIO"));
        mvc.perform(get("/api/profesionales").param("todos", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fotoUrl").value("data:image/jpeg;base64,PADRON"))
                .andExpect(jsonPath("$[0].nombre").value("Luciano"));
    }

    @Test
    void listingStillWorksWhenUsuariosCannotAnswer() throws Exception {
        UUID usuarioId = UUID.randomUUID();
        when(gateway.listarProfesionales("ACTIVO", null))
                .thenReturn(mapper.createArrayNode().add(profesional(usuarioId, "P-2003")));
        when(gateway.buscarUsuarioPorId(usuarioId)).thenThrow(new RuntimeException("ms-usuarios caído"));
        mvc.perform(get("/api/profesionales").param("estado", "ACTIVO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].legajo").value("P-2003"))
                .andExpect(jsonPath("$[0].nombre").doesNotExist());
    }
}

package com.vinculaup.bff_web;

import com.vinculaup.bff_web.service.BackendGateway;
import com.vinculaup.bff_web.service.KeycloakAdminService;
import jakarta.servlet.Filter;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El listado de solicitudes para los indicadores del panel sólo lo puede leer el
 * rol ADMIN, y una cuenta suspendida tampoco llega a verlo.
 */
@SpringBootTest
class SolicitudPanelTests {

    @Autowired WebApplicationContext context;
    @MockitoBean BackendGateway gateway;
    @MockitoBean KeycloakAdminService keycloakAdmin;
    @MockitoBean JwtDecoder decoder;

    private MockMvc mvc;
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final UUID subject = UUID.randomUUID();
    private final UUID usuarioId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
        for (String role : List.of("ADMIN", "PROFESIONAL", "CLIENTE")) {
            when(decoder.decode(role)).thenReturn(Jwt.withTokenValue(role).header("alg", "RS256")
                    .subject(subject.toString()).claim("roles", List.of(role)).build());
        }
    }

    private void padronDevuelve(String estado, String rolNegocio) {
        ObjectNode usuario = mapper.createObjectNode()
                .put("id", usuarioId.toString())
                .put("keycloakId", subject.toString())
                .put("nombre", "Lucia")
                .put("apellido", "Benitez")
                .put("email", "admin@vincula-up.local")
                .put("rolNegocio", rolNegocio)
                .put("estado", estado);
        when(gateway.buscarUsuarioPorKeycloakId(any(), any(), any(), any(), any())).thenReturn(usuario);
    }

    @Test
    void adminReadsTheRequestsOfTheWholePlatform() throws Exception {
        padronDevuelve("ACTIVO", "ADMIN");
        ArrayNode panel = mapper.createArrayNode();
        ObjectNode solicitud = mapper.createObjectNode()
                .put("id", UUID.randomUUID().toString())
                .put("clienteId", usuarioId.toString())
                .put("profesionalId", UUID.randomUUID().toString())
                .put("especialidadId", UUID.randomUUID().toString())
                .put("estado", "COMPLETADA")
                .put("puntaje", 5);
        panel.add(solicitud);
        when(gateway.listarSolicitudesParaPanel()).thenReturn(panel);

        mvc.perform(get("/api/solicitudes/panel").header("Authorization", "Bearer ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].estado").value("COMPLETADA"))
                .andExpect(jsonPath("$[0].puntaje").value(5));
    }

    @Test
    void clientsAndProfessionalsCannotReadThePanel() throws Exception {
        padronDevuelve("ACTIVO", "CLIENTE");
        mvc.perform(get("/api/solicitudes/panel").header("Authorization", "Bearer CLIENTE"))
                .andExpect(status().isForbidden());

        padronDevuelve("ACTIVO", "PROFESIONAL");
        mvc.perform(get("/api/solicitudes/panel").header("Authorization", "Bearer PROFESIONAL"))
                .andExpect(status().isForbidden());

        verify(gateway, never()).listarSolicitudesParaPanel();
    }

    @Test
    void bannedAdminCannotReadThePanel() throws Exception {
        padronDevuelve("SUSPENDIDO", "ADMIN");

        mvc.perform(get("/api/solicitudes/panel").header("Authorization", "Bearer ADMIN"))
                .andExpect(status().isForbidden());

        verify(gateway, never()).listarSolicitudesParaPanel();
    }
}

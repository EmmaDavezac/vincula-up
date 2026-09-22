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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Reglas de identidad del BFF: baneo de cuentas, promoción del rol del
 * profesional invitado que se auto-registra, y alta de profesionales sólo para
 * administradores.
 */
@SpringBootTest
class UsuarioAdminTests {

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

    private ObjectNode usuario(String estado, String rolNegocio) {
        return mapper.createObjectNode()
                .put("id", usuarioId.toString())
                .put("keycloakId", subject.toString())
                .put("nombre", "Sofia")
                .put("apellido", "Gomez")
                .put("email", "sofia@vincula-up.local")
                .put("rolNegocio", rolNegocio)
                .put("estado", estado);
    }

    private void padronDevuelve(String estado, String rolNegocio) {
        when(gateway.buscarUsuarioPorKeycloakId(any(), any(), any(), any(), any()))
                .thenReturn(usuario(estado, rolNegocio));
    }

    @Test
    void bannedAccountCannotOperate() throws Exception {
        padronDevuelve("SUSPENDIDO", "CLIENTE");

        mvc.perform(get("/api/usuarios/por-keycloak").param("keycloakId", subject.toString())
                .header("Authorization", "Bearer CLIENTE"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("suspendida")));
    }

    @Test
    void invitedProfessionalIsPromotedInKeycloakOnFirstLogin() throws Exception {
        // El padrón ya lo reconoce como profesional, pero su token todavía dice CLIENTE.
        padronDevuelve("ACTIVO", "PROFESIONAL");

        mvc.perform(get("/api/usuarios/por-keycloak").param("keycloakId", subject.toString())
                .header("Authorization", "Bearer CLIENTE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rolNegocio").value("PROFESIONAL"));

        verify(keycloakAdmin).promoverAProfesional(subject);
    }

    @Test
    void padronNeverGrantsAdminRole() throws Exception {
        // Un dato mal cargado en el padrón no puede escalar privilegios en Keycloak.
        padronDevuelve("ACTIVO", "ADMIN");

        mvc.perform(get("/api/usuarios/por-keycloak").param("keycloakId", subject.toString())
                .header("Authorization", "Bearer CLIENTE"))
                .andExpect(status().isOk());

        verify(keycloakAdmin, never()).promoverAProfesional(any());
    }

    @Test
    void professionalRegistrationIsAdminOnly() throws Exception {
        String payload = "{\"nombre\":\"Luciano\",\"apellido\":\"Benitez\","
                + "\"email\":\"luciano@vincula-up.local\",\"telefono\":\"3442-555555\","
                + "\"legajo\":\"P-3001\",\"especialidadIds\":[]}";

        mvc.perform(post("/api/profesionales/alta").header("Authorization", "Bearer CLIENTE")
                .contentType("application/json").content(payload))
                .andExpect(status().isForbidden());

        when(gateway.buscarUsuarioPorEmail("luciano@vincula-up.local")).thenReturn(null);
        when(gateway.crearUsuario(any())).thenReturn(mapper.createObjectNode().put("id", usuarioId.toString()));
        when(gateway.crearProfesional(any())).thenReturn(mapper.createObjectNode().put("id", UUID.randomUUID().toString()));

        mvc.perform(post("/api/profesionales/alta").header("Authorization", "Bearer ADMIN")
                .contentType("application/json").content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.id").value(usuarioId.toString()))
                .andExpect(jsonPath("$.profesional.id").exists());
    }

    /**
     * "Mi cuenta": el usuario edita su propio perfil sin pasar el id por la
     * URL. El BFF resuelve el id desde el token e ignora email/rol/estado
     * aunque vengan en el body.
     */
    @Test
    void myAccountUpdatesOwnProfileAndIgnoresSensitiveFields() throws Exception {
        padronDevuelve("ACTIVO", "CLIENTE");
        when(gateway.actualizarUsuario(any(), any()))
                .thenAnswer(invocation -> invocation.getArgument(1));

        String payload = "{\"nombre\":\"Sofia Belen\",\"apellido\":\"Gomez\","
                + "\"telefono\":\"3764 99-9999\",\"fotoUrl\":null,"
                + "\"email\":\"otro@vincula-up.local\",\"rolNegocio\":\"ADMIN\",\"estado\":\"SUSPENDIDO\"}";

        mvc.perform(patch("/api/usuarios/yo").header("Authorization", "Bearer CLIENTE")
                .contentType("application/json").content(payload))
                .andExpect(status().isOk());

        var captor = org.mockito.ArgumentCaptor.forClass(UUID.class);
        var bodyCaptor = org.mockito.ArgumentCaptor.forClass(JsonNode.class);
        verify(gateway).actualizarUsuario(captor.capture(), bodyCaptor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(usuarioId, captor.getValue());
        JsonNode sent = bodyCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertEquals("Sofia Belen", sent.path("nombre").asText());
        org.junit.jupiter.api.Assertions.assertTrue(sent.path("email").isMissingNode());
        org.junit.jupiter.api.Assertions.assertTrue(sent.path("rolNegocio").isMissingNode());
        org.junit.jupiter.api.Assertions.assertTrue(sent.path("estado").isMissingNode());
    }

    @Test
    void updatingAnotherUserByIdRequiresAdmin() throws Exception {
        String payload = "{\"nombre\":\"X\",\"apellido\":\"Y\",\"telefono\":\"1\"}";

        // Un cliente autenticado no puede usar el endpoint con id ajeno.
        mvc.perform(patch("/api/usuarios/" + usuarioId).header("Authorization", "Bearer CLIENTE")
                .contentType("application/json").content(payload))
                .andExpect(status().isForbidden());
    }

    @Test
    void myAccountReadReturnsOwnProfile() throws Exception {
        padronDevuelve("ACTIVO", "CLIENTE");

        mvc.perform(get("/api/usuarios/yo").header("Authorization", "Bearer CLIENTE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(usuarioId.toString()))
                .andExpect(jsonPath("$.email").value("sofia@vincula-up.local"));
    }
}
package com.vinculaup.bff_web;

import com.vinculaup.bff_web.service.BackendGateway;
import jakarta.servlet.Filter;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class ProfessionalAccessTests {
    @Autowired WebApplicationContext context;
    @MockitoBean BackendGateway gateway;
    @MockitoBean JwtDecoder decoder;
    private MockMvc mvc;
    private final UUID subject = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UUID profileId = UUID.randomUUID();
    private final UUID requestId = UUID.randomUUID();
    private final JsonMapper mapper = JsonMapper.builder().build();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class)).build();
        for (String role : List.of("PROFESIONAL", "CLIENTE", "ADMIN")) {
            when(decoder.decode(role)).thenReturn(Jwt.withTokenValue(role).header("alg", "RS256")
                    .subject(subject.toString()).claim("roles", List.of(role)).build());
        }
        when(gateway.buscarUsuarioPorKeycloakId(eq(subject), any(), any(), any(), any()))
                .thenReturn(mapper.createObjectNode().put("id", userId.toString()));
    }

    private ObjectNode profile(String estado) {
        return mapper.createObjectNode().put("id", profileId.toString()).put("estado", estado);
    }

    @Test
    void profileLookupUsesSessionIdentityAndReturnsInactiveProfile() throws Exception {
        when(gateway.obtenerMiPerfil(userId, subject)).thenReturn(ResponseEntity.ok(profile("CARGADO")));
        mvc.perform(get("/api/usuarios/por-keycloak").param("keycloakId", UUID.randomUUID().toString())
                .header("Authorization", "Bearer PROFESIONAL"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(userId.toString()));
        mvc.perform(get("/api/profesionales/mi-perfil").param("usuarioId", UUID.randomUUID().toString())
                .header("Authorization", "Bearer PROFESIONAL"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("CARGADO"));
        verify(gateway).obtenerMiPerfil(userId, subject);
    }


    @Test
    void anonymousAndOtherRolesCannotActivate() throws Exception {
        mvc.perform(patch("/api/profesionales/activar").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        for (String role : List.of("CLIENTE", "ADMIN")) {
            mvc.perform(patch("/api/profesionales/activar").header("Authorization", "Bearer " + role)
                    .contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
        }
        verify(gateway, never()).activarProfesional(any());
    }

    @Test
    void inactiveAndSuspendedProfilesCannotReceiveOrAccept() throws Exception {
        for (String estado : List.of("CARGADO", "SUSPENDIDO")) {
            when(gateway.obtenerMiPerfil(userId, subject)).thenReturn(ResponseEntity.ok(profile(estado)));
            mvc.perform(get("/api/solicitudes/mias").param("usuarioId", userId.toString())
                    .header("Authorization", "Bearer PROFESIONAL")).andExpect(status().isForbidden());
            mvc.perform(patch("/api/solicitudes/" + requestId + "/aceptar")
                    .header("Authorization", "Bearer PROFESIONAL").contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
        }
        verify(gateway, never()).listarSolicitudes(any(), any(), any(), any());
        verify(gateway, never()).aceptarSolicitud(any(), any());
    }

    @Test
    void activationThenReceiptAndAcceptanceUseAuthenticatedIdentity() throws Exception {
        when(gateway.obtenerMiPerfil(userId, subject)).thenReturn(ResponseEntity.ok(profile("CARGADO")));
        when(gateway.listarSolicitudes(userId, List.of(subject), "RECIBIDAS", "PROFESIONAL"))
                .thenReturn(mapper.createArrayNode().add(mapper.createObjectNode().put("id", requestId.toString())));
        when(gateway.aceptarSolicitud(eq(requestId), any()))
                .thenReturn(mapper.createObjectNode().put("estado", "ACEPTADA"));
        mvc.perform(get("/api/solicitudes/mias").param("usuarioId", userId.toString())
                .header("Authorization", "Bearer PROFESIONAL")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/solicitudes/" + requestId + "/aceptar")
                .header("Authorization", "Bearer PROFESIONAL").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        when(gateway.activarProfesional(any())).thenAnswer(invocation -> {
            when(gateway.obtenerMiPerfil(userId, subject)).thenReturn(ResponseEntity.ok(profile("ACTIVO")));
            return profile("ACTIVO");
        });
        mvc.perform(patch("/api/profesionales/activar").header("Authorization", "Bearer PROFESIONAL")
                .contentType("application/json").content("{\"usuarioId\":\"ignored\",\"keycloakId\":\"ignored\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("ACTIVO"));
        verify(gateway).activarProfesional(argThat(body -> userId.toString().equals(body.path("usuarioId").asText())
                && subject.toString().equals(body.path("keycloakId").asText())));
        mvc.perform(get("/api/solicitudes/mias").param("usuarioId", UUID.randomUUID().toString())
                .param("aliasIds", UUID.randomUUID().toString()).param("rol", "CLIENTE")
                .header("Authorization", "Bearer PROFESIONAL")).andExpect(status().isOk());
        verify(gateway).listarSolicitudes(userId, List.of(subject), "RECIBIDAS", "PROFESIONAL");
        mvc.perform(patch("/api/solicitudes/" + requestId + "/aceptar")
                .header("Authorization", "Bearer PROFESIONAL").contentType("application/json")
                .content("{\"actorId\":\"ignored\",\"usuarioId\":\"ignored\"}"))
                .andExpect(status().isOk());
        verify(gateway).aceptarSolicitud(eq(requestId), argThat(body ->
                userId.toString().equals(body.path("actorId").asText()) && !body.has("usuarioId")));
        when(gateway.obtenerMiPerfil(userId, subject)).thenReturn(ResponseEntity.ok(profile("SUSPENDIDO")));
        mvc.perform(get("/api/solicitudes/mias").param("usuarioId", userId.toString())
                .header("Authorization", "Bearer PROFESIONAL")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/solicitudes/" + requestId + "/aceptar")
                .header("Authorization", "Bearer PROFESIONAL").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        verify(gateway, times(1)).listarSolicitudes(any(), any(), any(), any());
        verify(gateway, times(1)).aceptarSolicitud(any(), any());
    }
}

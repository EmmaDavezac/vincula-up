package com.vinculaup.bff_web.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import com.vinculaup.bff_web.service.BackendGateway;
import com.vinculaup.bff_web.service.FotoStorage;
import com.vinculaup.bff_web.service.KeycloakAdminService;
import com.vinculaup.bff_web.service.NotificacionService;
import com.vinculaup.bff_web.service.WebPushService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ApiControllerTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final BackendGateway gateway = mock(BackendGateway.class);
    private final ApiController controller = new ApiController(
            gateway,
            mock(KeycloakAdminService.class),
            mock(FotoStorage.class),
            mock(NotificacionService.class),
            mock(WebPushService.class),
            mock(SimpMessagingTemplate.class));

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publicListingExcludesProfessionalsWithoutAcceptedTerms() {
        UUID acceptedUserId = UUID.randomUUID();
        UUID pendingUserId = UUID.randomUUID();
        when(gateway.listarProfesionales(null, null)).thenReturn(professionals(acceptedUserId, pendingUserId));
        when(gateway.buscarUsuarioPorIdOKeycloakId(acceptedUserId)).thenReturn(user(acceptedUserId, true));
        when(gateway.buscarUsuarioPorIdOKeycloakId(pendingUserId)).thenReturn(user(pendingUserId, false));
        when(gateway.listarResumenCalificaciones()).thenReturn(MAPPER.createArrayNode());

        JsonNode result = controller.listarProfesionales(null, null);

        assertEquals(1, result.size());
        assertEquals(acceptedUserId.toString(), result.get(0).path("usuarioId").asText());
    }

    @Test
    void unauthenticatedRequestCannotIncludeProfessionalsPendingTerms() {
        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> controller.listarProfesionales(null, true));

        assertEquals(403, error.getStatusCode().value());
        verify(gateway, never()).listarProfesionales(null, true);
    }

    private JsonNode professionals(UUID... userIds) {
        var result = MAPPER.createArrayNode();
        for (UUID userId : userIds) {
            var professional = MAPPER.createObjectNode();
            professional.put("id", UUID.randomUUID().toString());
            professional.put("usuarioId", userId.toString());
            professional.put("legajo", "P-" + result.size());
            result.add(professional);
        }
        return result;
    }

    private JsonNode user(UUID id, boolean acceptedTerms) {
        var user = MAPPER.createObjectNode();
        user.put("id", id.toString());
        user.put("terminosAceptado", acceptedTerms);
        return user;
    }
}

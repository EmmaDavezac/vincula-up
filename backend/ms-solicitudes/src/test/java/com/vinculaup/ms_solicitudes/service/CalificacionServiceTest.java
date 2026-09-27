package com.vinculaup.ms_solicitudes.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vinculaup.ms_solicitudes.client.GeocodingClient;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.dto.CrearCalificacionRequest;
import com.vinculaup.ms_solicitudes.entity.Calificacion;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.CalificacionRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class CalificacionServiceTest {

    private final UUID solicitudId = UUID.randomUUID();
    private final UUID clienteId = UUID.randomUUID();
    private final UUID clienteKeycloakId = UUID.randomUUID();

    private CalificacionRepository calificacionRepository;
    private SolicitudRepository solicitudRepository;
    private CalificacionService service;

    @BeforeEach
    void setUp() {
        calificacionRepository = mock(CalificacionRepository.class);
        solicitudRepository = mock(SolicitudRepository.class);
        var profesionalesClient = mock(ProfesionalesClient.class);
        when(profesionalesClient.obtenerIdentidades(any())).thenReturn(List.of());
        var solicitudService = new SolicitudService(solicitudRepository, profesionalesClient, mock(GeocodingClient.class));
        service = new CalificacionService(calificacionRepository, solicitudRepository, solicitudService);

        // Solicitud histórica completada, guardada con el keycloakId del cliente.
        Solicitud solicitud = new Solicitud(clienteKeycloakId, UUID.randomUUID(), UUID.randomUUID(),
                "Calle 123", -34.60, -58.38, LocalDateTime.now().minusDays(1), "Se corta la luz y no vuelve.", null);
        solicitud.cambiarEstado(EstadoSolicitud.COMPLETADA);
        when(solicitudRepository.findById(solicitudId)).thenReturn(Optional.of(solicitud));
        when(calificacionRepository.findBySolicitudId(solicitudId)).thenReturn(Optional.empty());
        when(calificacionRepository.save(any(Calificacion.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void elClientePuedeCalificarAunqueLaSolicitudGuardeSuKeycloakId() {
        var response = service.crear(solicitudId,
                new CrearCalificacionRequest(clienteId, 5, "Excelente", clienteKeycloakId));

        assertNotNull(response);
        assertEquals(5, response.puntaje());
    }

    @Test
    void unTerceroNoPuedeCalificarLaSolicitud() {
        var ex = assertThrows(ResponseStatusException.class, () -> service.crear(solicitudId,
                new CrearCalificacionRequest(UUID.randomUUID(), 5, "", UUID.randomUUID())));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(calificacionRepository, never()).save(any(Calificacion.class));
    }
}

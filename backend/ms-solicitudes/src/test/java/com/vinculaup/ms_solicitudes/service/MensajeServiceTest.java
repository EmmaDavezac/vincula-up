package com.vinculaup.ms_solicitudes.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vinculaup.ms_solicitudes.client.GeocodingClient;
import com.vinculaup.ms_solicitudes.client.ProfesionalIdentidad;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.dto.EnviarMensajeRequest;
import com.vinculaup.ms_solicitudes.entity.Mensaje;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.MensajeRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class MensajeServiceTest {

    private MensajeRepository mensajeRepository;
    private SolicitudRepository solicitudRepository;
    private ProfesionalesClient profesionalesClient;
    private MensajeService service;

    private final UUID clienteId = UUID.randomUUID();
    private final UUID clienteKeycloakId = UUID.randomUUID();
    private final UUID perfilId = UUID.randomUUID();
    private final UUID profesionalUsuarioId = UUID.randomUUID();
    private final UUID profesionalKeycloakId = UUID.randomUUID();
    private final UUID solicitudId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mensajeRepository = mock(MensajeRepository.class);
        solicitudRepository = mock(SolicitudRepository.class);
        profesionalesClient = mock(ProfesionalesClient.class);
        // El servicio real resuelve las identidades del profesional contra el padrón (mockeado).
        var solicitudService = new SolicitudService(solicitudRepository, profesionalesClient, mock(GeocodingClient.class));
        service = new MensajeService(mensajeRepository, solicitudRepository, solicitudService);
        when(mensajeRepository.save(any(Mensaje.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(solicitudRepository.findById(solicitudId)).thenReturn(Optional.of(solicitudConIdentidadesHistoricas()));
        when(profesionalesClient.obtenerIdentidades(any()))
                .thenReturn(List.of(new ProfesionalIdentidad(perfilId, profesionalUsuarioId, "ACTIVO")));
    }

    /** Solicitud histórica: guardó el keycloakId como cliente y como profesional. */
    private Solicitud solicitudConIdentidadesHistoricas() {
        return new Solicitud(clienteKeycloakId, profesionalKeycloakId, UUID.randomUUID(),
                "Calle 123", -34.60, -58.38, LocalDateTime.now().plusDays(1), "Se pierde el agua en la cocina.", null);
    }

    @Test
    void elProfesionalPuedeEscribirAunqueLaSolicitudGuardeSuKeycloakId() {
        var response = service.enviar(solicitudId, new EnviarMensajeRequest(
                profesionalUsuarioId, "Hola, confirmo el turno", profesionalKeycloakId));

        assertNotNull(response);
        assertEquals("Hola, confirmo el turno", response.texto());
        assertEquals(profesionalUsuarioId, response.emisorId());
    }

    @Test
    void elClientePuedeEscribirAunqueLaSolicitudGuardeSuKeycloakId() {
        var response = service.enviar(solicitudId, new EnviarMensajeRequest(
                clienteId, "Perfecto, gracias", clienteKeycloakId));

        assertNotNull(response);
        assertEquals(clienteId, response.emisorId());
    }

    @Test
    void elClientePuedeLeerLosMensajesAunqueLaSolicitudGuardeSuKeycloakId() {
        when(mensajeRepository.findBySolicitudIdOrderByFechaEnvioAsc(solicitudId)).thenReturn(List.of());

        assertNotNull(service.listar(solicitudId, clienteId, clienteKeycloakId));
    }

    @Test
    void unTerceroNoPuedeEscribirEnLaSolicitud() {
        var ex = assertThrows(ResponseStatusException.class, () -> service.enviar(solicitudId,
                new EnviarMensajeRequest(UUID.randomUUID(), "intruso", UUID.randomUUID())));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(mensajeRepository, never()).save(any(Mensaje.class));
    }

    @Test
    void unTerceroNoPuedeLeerLosMensajesDeLaSolicitud() {
        var ex = assertThrows(ResponseStatusException.class, () -> service.listar(solicitudId,
                UUID.randomUUID(), UUID.randomUUID()));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }
}

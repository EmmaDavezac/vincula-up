package com.vinculaup.ms_solicitudes.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vinculaup.ms_solicitudes.client.DisponibilidadProfesional;
import com.vinculaup.ms_solicitudes.client.GeocodingClient;
import com.vinculaup.ms_solicitudes.client.ProfesionalIdentidad;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.dto.CrearSolicitudRequest;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class SolicitudServiceTest {

    private SolicitudRepository repository;
    private ProfesionalesClient profesionalesClient;
    private GeocodingClient geocodingClient;
    private SolicitudService service;

    @BeforeEach
    void setUp() {
        repository = mock(SolicitudRepository.class);
        profesionalesClient = mock(ProfesionalesClient.class);
        geocodingClient = mock(GeocodingClient.class);
        service = new SolicitudService(repository, profesionalesClient, geocodingClient);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"CARGADO", "SUSPENDIDO"})
    void noPermiteAceptarSiElPerfilNoEstaActivo(String estado) {
        UUID id = UUID.randomUUID();
        UUID profId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        Solicitud solicitud = new Solicitud(UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle 123", -34.60, -58.38, LocalDateTime.now().plusDays(1));
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));
        when(profesionalesClient.obtenerPorId(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, usuarioId, estado)));
        var ex = assertThrows(ResponseStatusException.class, () -> service.aceptar(id,
                new com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest(usuarioId, "")));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals(com.vinculaup.ms_solicitudes.entity.EstadoSolicitud.PENDIENTE, solicitud.getEstado());
    }

    @Test
    void soloElProfesionalActivoDuenoPuedeAceptarUnaVez() {
        UUID id = UUID.randomUUID();
        UUID profId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        Solicitud solicitud = new Solicitud(UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle 123", -34.60, -58.38, LocalDateTime.now().plusDays(1));
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));
        when(profesionalesClient.obtenerPorId(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, usuarioId, "ACTIVO")));
        var ajeno = assertThrows(ResponseStatusException.class, () -> service.aceptar(id,
                new com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest(UUID.randomUUID(), "")));
        assertEquals(HttpStatus.FORBIDDEN, ajeno.getStatusCode());
        var request = new com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest(usuarioId, "");
        assertEquals(com.vinculaup.ms_solicitudes.entity.EstadoSolicitud.ACEPTADA, service.aceptar(id, request).estado());
        var repetida = assertThrows(ResponseStatusException.class, () -> service.aceptar(id, request));
        assertEquals(HttpStatus.CONFLICT, repetida.getStatusCode());
    }


    @Test
    void rechazaSolicitudSiProfesionalNoExiste() {
        UUID profId = UUID.randomUUID();
        when(profesionalesClient.obtenerPorId(profId)).thenReturn(Optional.empty());

        CrearSolicitudRequest request = new CrearSolicitudRequest(
                UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle Falsa 123", -34.60, -58.38, LocalDateTime.now());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.crear(request));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("no existe"));
    }

    @Test
    void rechazaSolicitudSiProfesionalNoEstaActivo() {
        UUID profId = UUID.randomUUID();
        when(profesionalesClient.obtenerPorId(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, UUID.randomUUID(), "CARGADO")));

        CrearSolicitudRequest request = new CrearSolicitudRequest(
                UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle Falsa 123", -34.60, -58.38, LocalDateTime.now());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.crear(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("activado"));
    }

    @Test
    void permiteSolicitudSiProfesionalEstaActivoYDisponible() {
        UUID profId = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID espId = UUID.randomUUID();
        // Lunes a las 10:00
        LocalDateTime fecha = LocalDateTime.of(2026, 9, 21, 10, 0);

        when(profesionalesClient.obtenerPorId(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, UUID.randomUUID(), "ACTIVO")));
        when(profesionalesClient.obtenerDisponibilidad(profId))
                .thenReturn(List.of(new DisponibilidadProfesional("LUNES", LocalTime.of(8, 0), LocalTime.of(18, 0))));
        when(repository.existsByClienteIdAndEspecialidadIdAndEstadoIn(eq(clienteId), eq(espId), any()))
                .thenReturn(false);
        when(repository.save(any(Solicitud.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CrearSolicitudRequest request = new CrearSolicitudRequest(
                clienteId, profId, espId,
                "Calle Falsa 123", -34.60, -58.38, fecha);

        var response = service.crear(request);
        assertNotNull(response);
        assertEquals(clienteId, response.clienteId());
        assertEquals(profId, response.profesionalId());
    }
}

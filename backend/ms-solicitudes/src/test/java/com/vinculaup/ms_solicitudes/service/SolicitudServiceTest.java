package com.vinculaup.ms_solicitudes.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vinculaup.ms_solicitudes.client.GeocodingClient;
import com.vinculaup.ms_solicitudes.client.ProfesionalIdentidad;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.config.SolicitudExpiradaException;
import com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest;
import com.vinculaup.ms_solicitudes.dto.CrearSolicitudRequest;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class SolicitudServiceTest {

    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final ProfesionalesClient profesionalesClient = mock(ProfesionalesClient.class);
    private final GeocodingClient geocodingClient = mock(GeocodingClient.class);
    private final SolicitudService service =
            new SolicitudService(solicitudRepository, profesionalesClient, geocodingClient, 24);

    private final UUID solicitudId = UUID.randomUUID();
    private final UUID clienteId = UUID.randomUUID();
    private final UUID profesionalId = UUID.randomUUID();
    private final UUID profesionalUsuarioId = UUID.randomUUID();
    private final Solicitud solicitud = new Solicitud(
            clienteId, profesionalId, UUID.randomUUID(), "Calle 123", "Centro",
            -32.48, -58.23, LocalDateTime.now().plusDays(1), "Revisar instalación", null);

    @BeforeEach
    void configuraSolicitud() {
        ReflectionTestUtils.setField(solicitud, "id", solicitudId);
        when(solicitudRepository.findById(solicitudId)).thenReturn(Optional.of(solicitud));
    }

    @Test
    void profesionalAsignadoPuedeAceptarLaSolicitud() {
        when(profesionalesClient.obtenerIdentidades(anyCollection()))
                .thenReturn(List.of(new ProfesionalIdentidad(profesionalId, profesionalUsuarioId, "ACTIVO")));

        var response = service.aceptar(solicitudId, new CambiarEstadoRequest(profesionalUsuarioId, null));

        assertEquals(EstadoSolicitud.ACEPTADA, response.estado());
        assertEquals(EstadoSolicitud.ACEPTADA, solicitud.getEstado());
    }

    @Test
    void otroProfesionalNoPuedeAceptarLaSolicitud() {
        when(profesionalesClient.obtenerIdentidades(anyCollection()))
                .thenReturn(List.of(new ProfesionalIdentidad(UUID.randomUUID(), profesionalUsuarioId, "ACTIVO")));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.aceptar(solicitudId, new CambiarEstadoRequest(profesionalUsuarioId, null)));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals(EstadoSolicitud.PENDIENTE, solicitud.getEstado());
    }

    @Test
    void noPermiteAceptarUnaSolicitudVencida() {
        ReflectionTestUtils.setField(solicitud, "fechaExpiracion", LocalDateTime.now().minusMinutes(1));
        when(profesionalesClient.obtenerIdentidades(anyCollection()))
                .thenReturn(List.of(new ProfesionalIdentidad(profesionalId, profesionalUsuarioId, "ACTIVO")));

        assertThrows(SolicitudExpiradaException.class,
                () -> service.aceptar(solicitudId, new CambiarEstadoRequest(profesionalUsuarioId, null)));

        assertEquals(EstadoSolicitud.VENCIDA, solicitud.getEstado());
    }

    @Test
    void clienteParticipantePuedeCompletarUnaSolicitudAceptada() {
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        when(profesionalesClient.obtenerIdentidades(anyCollection())).thenReturn(List.of());

        var response = service.completar(solicitudId, new CambiarEstadoRequest(clienteId, null));

        assertEquals(EstadoSolicitud.COMPLETADA, response.estado());
        assertEquals(EstadoSolicitud.COMPLETADA, solicitud.getEstado());
    }

    @Test
    void cancelarExigeMotivoYRegistraAlClienteQueCancela() {
        when(profesionalesClient.obtenerIdentidades(anyCollection())).thenReturn(List.of());

        ResponseStatusException sinMotivo = assertThrows(ResponseStatusException.class,
                () -> service.cancelar(solicitudId, new CambiarEstadoRequest(clienteId, "  ")));
        assertEquals(HttpStatus.BAD_REQUEST, sinMotivo.getStatusCode());
        assertEquals(EstadoSolicitud.PENDIENTE, solicitud.getEstado());

        var response = service.cancelar(solicitudId, new CambiarEstadoRequest(clienteId, "  Ya no hace falta  "));

        assertEquals(EstadoSolicitud.CANCELADA, response.estado());
        assertEquals("Ya no hace falta", solicitud.getMotivoCancelacion());
        assertEquals(clienteId, solicitud.getCanceladaPor());
    }

    @Test
    void unTerceroNoPuedeCompletarLaSolicitud() {
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        when(profesionalesClient.obtenerIdentidades(anyCollection())).thenReturn(List.of());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.completar(solicitudId,
                        new CambiarEstadoRequest(UUID.randomUUID(), null)));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals(EstadoSolicitud.ACEPTADA, solicitud.getEstado());
    }

    @Test
    void vencerPendientesActualizaYDevuelveLasSolicitudes() {
        ReflectionTestUtils.setField(solicitud, "fechaExpiracion", LocalDateTime.now().minusMinutes(1));
        when(solicitudRepository.findPendientesExpiradas(any(LocalDateTime.class)))
                .thenReturn(List.of(solicitud));
        when(solicitudRepository.saveAll(anyList())).thenReturn(List.of(solicitud));

        var responses = service.expirarPendientes();

        assertEquals(1, responses.size());
        assertEquals(EstadoSolicitud.VENCIDA, responses.get(0).estado());
        assertEquals("El profesional no respondió dentro del plazo límite.", solicitud.getMotivoCancelacion());
        verify(solicitudRepository).saveAll(List.of(solicitud));
    }

    @Test
    void crearRechazaUnHorarioFueraDeDisponibilidadSinGuardar() {
        UUID especialidadId = UUID.randomUUID();
        LocalDate lunes = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        LocalDateTime inicio = lunes.atTime(8, 0);
        LocalDateTime fin = lunes.atTime(10, 0);
        when(profesionalesClient.obtenerPorIdentidad(profesionalId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profesionalId, profesionalUsuarioId, "ACTIVO")));
        when(profesionalesClient.obtenerDisponibilidad(profesionalId)).thenReturn(List.of());
        when(geocodingClient.resolverZonaDePunto(-32.48, -58.23)).thenReturn("Centro");
        CrearSolicitudRequest request = new CrearSolicitudRequest(
                clienteId, profesionalId, especialidadId, "Calle 123", -32.48, -58.23,
                inicio, fin, "Revisar instalación eléctrica");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.crear(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(solicitudRepository, never()).save(any(Solicitud.class));
    }
}

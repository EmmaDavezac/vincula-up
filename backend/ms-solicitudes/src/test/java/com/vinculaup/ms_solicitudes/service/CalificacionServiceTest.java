package com.vinculaup.ms_solicitudes.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vinculaup.ms_solicitudes.client.GeocodingClient;
import com.vinculaup.ms_solicitudes.client.ProfesionalIdentidad;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest;
import com.vinculaup.ms_solicitudes.dto.CrearCalificacionRequest;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class CalificacionServiceTest {

    private final CalificacionRepository calificacionRepository = mock(CalificacionRepository.class);
    private final SolicitudRepository solicitudRepository = mock(SolicitudRepository.class);
    private final ProfesionalesClient profesionalesClient = mock(ProfesionalesClient.class);
    private final SolicitudService solicitudService =
            new SolicitudService(solicitudRepository, profesionalesClient, mock(GeocodingClient.class), 24);
    private final CalificacionService service =
            new CalificacionService(calificacionRepository, solicitudRepository, solicitudService);

    private final UUID solicitudId = UUID.randomUUID();
    private final UUID clienteId = UUID.randomUUID();
    private final Solicitud solicitud = new Solicitud(
            clienteId, UUID.randomUUID(), UUID.randomUUID(), "Calle 123", "Centro",
            null, null, LocalDateTime.now().plusDays(1), "Revisar instalación", null);

    @BeforeEach
    void configuraSolicitud() {
        ReflectionTestUtils.setField(solicitud, "id", solicitudId);
        when(solicitudRepository.findById(solicitudId)).thenReturn(Optional.of(solicitud));
        when(profesionalesClient.obtenerIdentidades(anyCollection())).thenReturn(List.of());
    }

    @Test
    void clientePuedeCalificarUnaSolicitudCompletadaUnaSolaVez() {
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        solicitud.cambiarEstado(EstadoSolicitud.COMPLETADA);
        when(calificacionRepository.findBySolicitudId(solicitudId)).thenReturn(Optional.empty());
        when(calificacionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.crear(solicitudId, new CrearCalificacionRequest(clienteId, 5, "Puntual"));

        assertEquals(solicitudId, response.solicitudId());
        assertEquals(5, response.puntaje());
        assertEquals("Puntual", response.comentario());
        verify(calificacionRepository).save(any());
    }

    @Test
    void completaElFlujoDeAceptarCompletarYCalificar() {
        UUID profesionalUsuarioId = UUID.randomUUID();
        when(profesionalesClient.obtenerIdentidades(anyCollection()))
                .thenReturn(List.of(new ProfesionalIdentidad(
                        solicitud.getProfesionalId(), profesionalUsuarioId, "ACTIVO")));
        when(calificacionRepository.findBySolicitudId(solicitudId)).thenReturn(Optional.empty());
        when(calificacionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var aceptada = solicitudService.aceptar(
                solicitudId, new CambiarEstadoRequest(profesionalUsuarioId, null));
        var completada = solicitudService.completar(solicitudId, new CambiarEstadoRequest(clienteId, null));
        var calificacion = service.crear(
                solicitudId, new CrearCalificacionRequest(clienteId, 5, "Trabajo terminado correctamente"));

        assertEquals(EstadoSolicitud.ACEPTADA, aceptada.estado());
        assertEquals(EstadoSolicitud.COMPLETADA, completada.estado());
        assertEquals(EstadoSolicitud.COMPLETADA, solicitud.getEstado());
        assertEquals(5, calificacion.puntaje());
        assertEquals(solicitudId, calificacion.solicitudId());
    }

    @Test
    void rechazaCalificacionDeUnTercero() {
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        solicitud.cambiarEstado(EstadoSolicitud.COMPLETADA);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.crear(solicitudId,
                        new CrearCalificacionRequest(UUID.randomUUID(), 5, "No participante")));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void soloPermiteCalificarUnaSolicitudCompletada() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.crear(solicitudId, new CrearCalificacionRequest(clienteId, 5, "Todavía pendiente")));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void rechazaUnaSegundaCalificacionParaLaMismaSolicitud() {
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        solicitud.cambiarEstado(EstadoSolicitud.COMPLETADA);
        when(calificacionRepository.findBySolicitudId(solicitudId))
                .thenReturn(Optional.of(new com.vinculaup.ms_solicitudes.entity.Calificacion(
                        solicitudId, 4, "Anterior")));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.crear(solicitudId, new CrearCalificacionRequest(clienteId, 5, "Duplicada")));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }
}

package com.vinculaup.ms_solicitudes.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vinculaup.ms_solicitudes.entity.Calificacion;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.CalificacionRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SolicitudPanelServiceTest {

    private final UUID specialtyId = UUID.randomUUID();

    private SolicitudRepository solicitudRepository;
    private CalificacionRepository calificacionRepository;
    private SolicitudPanelService service;

    @BeforeEach
    void setUp() {
        solicitudRepository = mock(SolicitudRepository.class);
        calificacionRepository = mock(CalificacionRepository.class);
        service = new SolicitudPanelService(solicitudRepository, calificacionRepository);
    }

    /** El id lo genera JPA: se inyecta por reflexión para poder asociar la calificación. */
    private Solicitud solicitud(UUID id, EstadoSolicitud estado) {
        Solicitud solicitud = new Solicitud(UUID.randomUUID(), UUID.randomUUID(), specialtyId,
                "Calle 123", -34.60, -58.38, LocalDateTime.now().minusDays(1), "Se corta la luz y no vuelve.", null);
        solicitud.cambiarEstado(estado);
        try {
            Field field = Solicitud.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(solicitud, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return solicitud;
    }

    @Test
    void listaLasSolicitudesConSuPuntaje() {
        UUID calificadaId = UUID.randomUUID();
        UUID sinCalificarId = UUID.randomUUID();
        when(solicitudRepository.findAllByOrderByFechaCreacionDesc()).thenReturn(List.of(
                solicitud(calificadaId, EstadoSolicitud.COMPLETADA),
                solicitud(sinCalificarId, EstadoSolicitud.PENDIENTE)));
        when(calificacionRepository.findAll())
                .thenReturn(List.of(new Calificacion(calificadaId, 5, "Excelente")));

        var panel = service.listar();

        assertEquals(2, panel.size());
        assertEquals(5, panel.get(0).puntaje());
        assertEquals(EstadoSolicitud.COMPLETADA, panel.get(0).estado());
        assertEquals(specialtyId, panel.get(0).especialidadId());
        assertNull(panel.get(1).puntaje());
    }

    @Test
    void noRepiteLaConsultaDeCalificacionesPorSolicitud() {
        List<Solicitud> solicitudes = List.of(
                solicitud(UUID.randomUUID(), EstadoSolicitud.COMPLETADA),
                solicitud(UUID.randomUUID(), EstadoSolicitud.ACEPTADA),
                solicitud(UUID.randomUUID(), EstadoSolicitud.PENDIENTE));
        when(solicitudRepository.findAllByOrderByFechaCreacionDesc()).thenReturn(solicitudes);
        when(calificacionRepository.findAll()).thenReturn(List.of());

        service.listar();

        // Un solo findAll evita el N+1 sobre el listado del panel.
        verify(calificacionRepository, times(1)).findAll();
        verify(solicitudRepository, times(1)).findAllByOrderByFechaCreacionDesc();
    }
}

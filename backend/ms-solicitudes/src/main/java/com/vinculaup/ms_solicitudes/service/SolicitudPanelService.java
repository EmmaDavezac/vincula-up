package com.vinculaup.ms_solicitudes.service;

import com.vinculaup.ms_solicitudes.dto.SolicitudPanelResponse;
import com.vinculaup.ms_solicitudes.entity.Calificacion;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.CalificacionRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Vista de solo lectura para el panel de administración: reúne todas las solicitudes con su
 * calificación para que el dashboard pueda medir el recorrido de las solicitudes, la
 * demanda por especialidad y la satisfacción sin que el frontend tenga que agregar
 * endpoint por endpoint.
 */
@Service
@Transactional(readOnly = true)
public class SolicitudPanelService {

    private final SolicitudRepository solicitudRepository;
    private final CalificacionRepository calificacionRepository;

    public SolicitudPanelService(SolicitudRepository solicitudRepository,
            CalificacionRepository calificacionRepository) {
        this.solicitudRepository = solicitudRepository;
        this.calificacionRepository = calificacionRepository;
    }

    /** Solicitudes de la más reciente a la más antigua, con el puntaje recibido (si lo hay). */
    public List<SolicitudPanelResponse> listar() {
        // Un solo findAll de calificaciones evita el N+1 sobre el listado del panel.
        Map<UUID, Integer> puntajesPorSolicitud = new HashMap<>();
        for (Calificacion calificacion : calificacionRepository.findAll()) {
            if (calificacion.getSolicitudId() != null) {
                puntajesPorSolicitud.putIfAbsent(calificacion.getSolicitudId(), calificacion.getPuntaje());
            }
        }

        return solicitudRepository.findAllByOrderByFechaCreacionDesc().stream()
                .map(solicitud -> toPanelResponse(solicitud, puntajesPorSolicitud))
                .toList();
    }

    private SolicitudPanelResponse toPanelResponse(Solicitud solicitud, Map<UUID, Integer> puntajes) {
        return new SolicitudPanelResponse(
                solicitud.getId(),
                solicitud.getClienteId(),
                solicitud.getProfesionalId(),
                solicitud.getEspecialidadId(),
                solicitud.getEstado(),
                puntajes.get(solicitud.getId()),
                solicitud.getFechaHoraPropuesta(),
                solicitud.getFechaCreacion(),
                solicitud.getFechaCambioEstado());
    }
}
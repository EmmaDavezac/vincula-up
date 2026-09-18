package com.vinculaup.ms_solicitudes.service;

import com.vinculaup.ms_solicitudes.dto.CalificacionResponse;
import com.vinculaup.ms_solicitudes.dto.CrearCalificacionRequest;
import com.vinculaup.ms_solicitudes.entity.Calificacion;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.CalificacionRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CalificacionService {

    private final CalificacionRepository calificacionRepository;
    private final SolicitudRepository solicitudRepository;

    public CalificacionService(CalificacionRepository calificacionRepository, SolicitudRepository solicitudRepository) {
        this.calificacionRepository = calificacionRepository;
        this.solicitudRepository = solicitudRepository;
    }

    public CalificacionResponse crear(UUID solicitudId, CrearCalificacionRequest request) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        if (!solicitud.getClienteId().equals(request.clienteId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el cliente puede calificar esta solicitud");
        }
        if (solicitud.getEstado() != EstadoSolicitud.COMPLETADA) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud debe estar completada para calificarla");
        }
        if (calificacionRepository.findBySolicitudId(solicitudId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud ya tiene una calificacion");
        }

        Calificacion calificacion = calificacionRepository.save(
                new Calificacion(solicitudId, request.puntaje(), request.comentario()));
        return toResponse(calificacion);
    }

    @Transactional(readOnly = true)
    public CalificacionResponse obtenerPorSolicitudId(UUID solicitudId) {
        return calificacionRepository.findBySolicitudId(solicitudId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Calificacion no encontrada"));
    }

    private CalificacionResponse toResponse(Calificacion calificacion) {
        return new CalificacionResponse(
                calificacion.getId(), calificacion.getSolicitudId(), calificacion.getPuntaje(),
                calificacion.getComentario(), calificacion.getFechaCalificacion());
    }
}

package com.vinculaup.ms_solicitudes.service;

import com.vinculaup.ms_solicitudes.dto.CalificacionResponse;
import com.vinculaup.ms_solicitudes.dto.CrearCalificacionRequest;
import com.vinculaup.ms_solicitudes.entity.Calificacion;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.CalificacionRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.util.List;
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
    private final SolicitudService solicitudService;

    public CalificacionService(CalificacionRepository calificacionRepository, SolicitudRepository solicitudRepository,
            SolicitudService solicitudService) {
        this.calificacionRepository = calificacionRepository;
        this.solicitudRepository = solicitudRepository;
        this.solicitudService = solicitudService;
    }

    public CalificacionResponse crear(UUID solicitudId, CrearCalificacionRequest request) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        // El cliente puede estar guardado con su id de ms-usuarios o con el keycloakId histórico:
        // se comparan todas sus identidades (incluido el alias que envía el BFF).
        List<UUID> aliasIds = request.keycloakId() == null ? List.of() : List.of(request.keycloakId());
        boolean esCliente = solicitudService.resolverIdentidades(request.clienteId(), aliasIds).stream()
                .anyMatch(identidad -> identidad.equals(solicitud.getClienteId()));
        if (!esCliente) {
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

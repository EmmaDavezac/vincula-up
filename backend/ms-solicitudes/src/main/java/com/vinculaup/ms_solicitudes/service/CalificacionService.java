package com.vinculaup.ms_solicitudes.service;

import com.vinculaup.ms_solicitudes.dto.CalificacionResponse;
import com.vinculaup.ms_solicitudes.dto.CrearCalificacionRequest;
import com.vinculaup.ms_solicitudes.dto.ReputacionProfesionalResponse;
import com.vinculaup.ms_solicitudes.dto.ResenaResponse;
import com.vinculaup.ms_solicitudes.dto.ResumenCalificacionResponse;
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

    /**
     * Reputación de cada profesional que ya recibió calificaciones: promedio (con
     * un decimal) y cantidad de reseñas. Los profesionales sin calificaciones no
     * aparecen, que es la señal de "todavía no tiene reseñas".
     */
    @Transactional(readOnly = true)
    public List<ResumenCalificacionResponse> resumenPorProfesional() {
        return calificacionRepository.resumenPorProfesional().stream()
                .map(fila -> {
                    UUID profesionalId = (UUID) fila[0];
                    Double promedio = fila[1] == null ? null : (Double) fila[1];
                    long cantidad = ((Number) fila[2]).longValue();
                    double valor = promedio == null ? 0d
                            : Math.round(promedio * 10d) / 10d;
                    return new ResumenCalificacionResponse(profesionalId, valor, cantidad);
                })
                .toList();
    }

    /**
     * Reputación de un profesional con el detalle de las reseñas, para que pueda
     * verlas desde "Mi cuenta". Sin reseñas devuelve promedio 0 y lista vacía.
     */
    @Transactional(readOnly = true)
    public ReputacionProfesionalResponse reputacionDe(UUID profesionalId) {
        List<Object[]> filas = calificacionRepository.resenasDeProfesional(profesionalId);
        if (filas.isEmpty()) {
            return new ReputacionProfesionalResponse(0d, 0, List.of());
        }
        List<ResenaResponse> resenas = filas.stream()
                .map(fila -> new ResenaResponse(
                        (UUID) fila[0],
                        (UUID) fila[1],
                        (Integer) fila[2],
                        (String) fila[3],
                        fila[4] == null ? null : ((java.time.LocalDateTime) fila[4]),
                        (UUID) fila[5]))
                .toList();
        double suma = resenas.stream().mapToInt(ResenaResponse::puntaje).sum();
        double promedio = Math.round((suma / resenas.size()) * 10d) / 10d;
        return new ReputacionProfesionalResponse(promedio, resenas.size(), resenas);
    }

    private CalificacionResponse toResponse(Calificacion calificacion) {
        return new CalificacionResponse(
                calificacion.getId(), calificacion.getSolicitudId(), calificacion.getPuntaje(),
                calificacion.getComentario(), calificacion.getFechaCalificacion());
    }
}

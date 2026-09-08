package com.vinculaup.ms_solicitudes.service;

import com.vinculaup.ms_solicitudes.client.DisponibilidadProfesional;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.dto.CrearSolicitudRequest;
import com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest;
import com.vinculaup.ms_solicitudes.dto.SolicitudResponse;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SolicitudService {

    private static final List<EstadoSolicitud> ESTADOS_ACTIVOS = List.of(
            EstadoSolicitud.PENDIENTE, EstadoSolicitud.ACEPTADA);

    private final SolicitudRepository repository;
    private final ProfesionalesClient profesionalesClient;

    public SolicitudService(SolicitudRepository repository, ProfesionalesClient profesionalesClient) {
        this.repository = repository;
        this.profesionalesClient = profesionalesClient;
    }

    public SolicitudResponse crear(CrearSolicitudRequest request) {
        if (repository.existsByClienteIdAndEspecialidadIdAndEstadoIn(
                request.clienteId(), request.especialidadId(), ESTADOS_ACTIVOS)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya tenes una solicitud activa para esta especialidad");
        }
        if (!estaDentroDeDisponibilidad(request.profesionalId(), request.fechaHoraPropuesta())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El horario propuesto esta fuera de la disponibilidad del profesional");
        }

        Solicitud solicitud = repository.save(new Solicitud(
                request.clienteId(), request.profesionalId(), request.especialidadId(),
                request.direccionServicio(), request.fechaHoraPropuesta()));
        return toResponse(solicitud);
    }

    @Transactional(readOnly = true)
    public List<SolicitudResponse> listarPropias(UUID usuarioId) {
        return repository.findByClienteIdOrProfesionalId(usuarioId, usuarioId).stream()
                .map(this::toResponse)
                .toList();
    }

    public SolicitudResponse aceptar(UUID id, CambiarEstadoRequest request) {
        Solicitud solicitud = find(id);
        ensureProfessionalActor(solicitud, request.actorId());
        ensureState(solicitud, EstadoSolicitud.PENDIENTE);
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        return toResponse(solicitud);
    }

    public SolicitudResponse rechazar(UUID id, CambiarEstadoRequest request) {
        Solicitud solicitud = find(id);
        ensureProfessionalActor(solicitud, request.actorId());
        ensureState(solicitud, EstadoSolicitud.PENDIENTE);
        solicitud.rechazar(request.motivo());
        return toResponse(solicitud);
    }

    public SolicitudResponse completar(UUID id, CambiarEstadoRequest request) {
        Solicitud solicitud = find(id);
        if (!solicitud.getClienteId().equals(request.actorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el cliente puede completar la solicitud");
        }
        ensureState(solicitud, EstadoSolicitud.ACEPTADA);
        solicitud.cambiarEstado(EstadoSolicitud.COMPLETADA);
        return toResponse(solicitud);
    }

    private Solicitud find(UUID id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
    }

    private void ensureProfessionalActor(Solicitud solicitud, UUID actorId) {
        if (!solicitud.getProfesionalId().equals(actorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El profesional no es dueño de esta solicitud");
        }
    }

    private void ensureState(Solicitud solicitud, EstadoSolicitud expected) {
        if (solicitud.getEstado() != expected) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La solicitud no permite esta transicion desde " + solicitud.getEstado());
        }
    }

    private boolean estaDentroDeDisponibilidad(UUID profesionalId, LocalDateTime fechaHora) {
        String diaEsperado = diaEnEspanol(fechaHora.getDayOfWeek());
        return profesionalesClient.obtenerDisponibilidad(profesionalId).stream()
                .filter(item -> item.diaSemana().equalsIgnoreCase(diaEsperado))
                .anyMatch(item -> !fechaHora.toLocalTime().isBefore(item.horaInicio())
                        && fechaHora.toLocalTime().isBefore(item.horaFin()));
    }

    private String diaEnEspanol(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "LUNES";
            case TUESDAY -> "MARTES";
            case WEDNESDAY -> "MIERCOLES";
            case THURSDAY -> "JUEVES";
            case FRIDAY -> "VIERNES";
            case SATURDAY -> "SABADO";
            case SUNDAY -> "DOMINGO";
        };
    }

    private SolicitudResponse toResponse(Solicitud solicitud) {
        return new SolicitudResponse(
                solicitud.getId(), solicitud.getClienteId(), solicitud.getProfesionalId(),
                solicitud.getEspecialidadId(), solicitud.getDireccionServicio(), solicitud.getFechaHoraPropuesta(),
                solicitud.getEstado(), solicitud.getFechaCreacion(), solicitud.getFechaCambioEstado());
    }
}

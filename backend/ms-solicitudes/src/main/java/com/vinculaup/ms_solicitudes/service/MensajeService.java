package com.vinculaup.ms_solicitudes.service;

import com.vinculaup.ms_solicitudes.dto.EnviarMensajeRequest;
import com.vinculaup.ms_solicitudes.dto.MensajeResponse;
import com.vinculaup.ms_solicitudes.entity.Mensaje;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.MensajeRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class MensajeService {

    private final MensajeRepository mensajeRepository;
    private final SolicitudRepository solicitudRepository;
    private final SolicitudService solicitudService;

    public MensajeService(MensajeRepository mensajeRepository, SolicitudRepository solicitudRepository, SolicitudService solicitudService) {
        this.mensajeRepository = mensajeRepository;
        this.solicitudRepository = solicitudRepository;
        this.solicitudService = solicitudService;
    }

    public MensajeResponse enviar(UUID solicitudId, EnviarMensajeRequest request) {
        Solicitud solicitud = findSolicitud(solicitudId);
        ensureParticipant(solicitud, request.emisorId(), request.keycloakId());
        Mensaje mensaje = mensajeRepository.save(new Mensaje(solicitudId, request.emisorId(), request.texto().trim()));
        return toResponse(mensaje);
    }

    @Transactional(readOnly = true)
    public List<MensajeResponse> listar(UUID solicitudId, UUID usuarioId, UUID keycloakId) {
        ensureParticipant(findSolicitud(solicitudId), usuarioId, keycloakId);
        return mensajeRepository.findBySolicitudIdOrderByFechaEnvioAsc(solicitudId).stream().map(this::toResponse).toList();
    }

    private Solicitud findSolicitud(UUID id) {
        return solicitudRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
    }

    /**
     * El cliente y el profesional pueden estar guardados en la solicitud con su id de ms-usuarios
     * o con el {@code keycloakId} histórico, así que se comparan todas las identidades del usuario
     * (incluido el alias que envía el BFF) contra los participantes de la solicitud.
     */
    private void ensureParticipant(Solicitud solicitud, UUID usuarioId, UUID keycloakId) {
        List<UUID> aliasIds = keycloakId == null ? List.of() : List.of(keycloakId);
        boolean participa = solicitudService.resolverIdentidades(usuarioId, aliasIds).stream()
                .anyMatch(identidad -> identidad.equals(solicitud.getClienteId())
                        || identidad.equals(solicitud.getProfesionalId()));
        if (!participa) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No participas de esta solicitud");
        }
    }

    private MensajeResponse toResponse(Mensaje mensaje) {
        return new MensajeResponse(mensaje.getId(), mensaje.getSolicitudId(), mensaje.getEmisorId(), mensaje.getTexto(), mensaje.getFechaEnvio());
    }
}

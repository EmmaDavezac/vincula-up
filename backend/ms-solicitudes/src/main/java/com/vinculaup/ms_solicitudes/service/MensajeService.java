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
        ensureParticipant(solicitud, request.emisorId());
        Mensaje mensaje = mensajeRepository.save(new Mensaje(solicitudId, request.emisorId(), request.texto().trim()));
        return toResponse(mensaje);
    }

    @Transactional(readOnly = true)
    public List<MensajeResponse> listar(UUID solicitudId, UUID usuarioId) {
        ensureParticipant(findSolicitud(solicitudId), usuarioId);
        return mensajeRepository.findBySolicitudIdOrderByFechaEnvioAsc(solicitudId).stream().map(this::toResponse).toList();
    }

    private Solicitud findSolicitud(UUID id) {
        return solicitudRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
    }

    private void ensureParticipant(Solicitud solicitud, UUID usuarioId) {
        if (solicitud.getClienteId().equals(usuarioId) || solicitud.getProfesionalId().equals(usuarioId)) {
            return;
        }
        var identidades = solicitudService.resolverIdentidades(usuarioId, null);
        if (!identidades.contains(solicitud.getProfesionalId()) && !identidades.contains(solicitud.getClienteId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No participas de esta solicitud");
        }
    }

    private MensajeResponse toResponse(Mensaje mensaje) {
        return new MensajeResponse(mensaje.getId(), mensaje.getSolicitudId(), mensaje.getEmisorId(), mensaje.getTexto(), mensaje.getFechaEnvio());
    }
}

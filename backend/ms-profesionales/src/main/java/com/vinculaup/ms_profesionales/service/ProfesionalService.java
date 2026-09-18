package com.vinculaup.ms_profesionales.service;

import com.vinculaup.ms_profesionales.dto.ActivarProfesionalRequest;
import com.vinculaup.ms_profesionales.dto.CrearProfesionalRequest;
import com.vinculaup.ms_profesionales.dto.EspecialidadResponse;
import com.vinculaup.ms_profesionales.dto.ProfesionalResponse;
import com.vinculaup.ms_profesionales.entity.Especialidad;
import com.vinculaup.ms_profesionales.entity.EstadoProfesional;
import com.vinculaup.ms_profesionales.entity.Profesional;
import com.vinculaup.ms_profesionales.repository.EspecialidadRepository;
import com.vinculaup.ms_profesionales.repository.ProfesionalRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProfesionalService {

    private final ProfesionalRepository profesionalRepository;
    private final EspecialidadRepository especialidadRepository;
    private final com.vinculaup.ms_profesionales.repository.DisponibilidadRepository disponibilidadRepository;

    public ProfesionalService(ProfesionalRepository profesionalRepository, EspecialidadRepository especialidadRepository,
            com.vinculaup.ms_profesionales.repository.DisponibilidadRepository disponibilidadRepository) {
        this.profesionalRepository = profesionalRepository;
        this.especialidadRepository = especialidadRepository;
        this.disponibilidadRepository = disponibilidadRepository;
    }

    public ProfesionalResponse crear(CrearProfesionalRequest request) {
        if (profesionalRepository.findByUsuarioId(request.usuarioId()).isPresent()) {
            throw conflict("El usuario ya tiene un perfil profesional");
        }
        if (profesionalRepository.existsByLegajoIgnoreCase(request.legajo())) {
            throw conflict("El legajo ya esta registrado");
        }
        Set<Especialidad> especialidades = request.especialidadIds().stream()
                .map(this::findEspecialidad)
                .collect(Collectors.toSet());
        return toResponse(profesionalRepository.save(new Profesional(request.usuarioId(), request.legajo(), especialidades)));
    }

    /**
     * Busca el perfil profesional por id de usuario y, si el padron quedó sembrado con el
     * {@code keycloakId}, reconcilia la identidad antes de responder.
     */
    @Transactional
    public java.util.Optional<ProfesionalResponse> buscarPorIdentidad(UUID usuarioId, UUID keycloakId) {
        return vincularIdentidad(usuarioId, keycloakId);
    }

    /**
     * Vincula una identidad de Keycloak con el perfil profesional existente.
     * <p>
     * El padron se siembra con el {@code keycloakId} como {@code usuarioId}, pero el frontend
     * opera con el id de {@code ms-usuarios}. Cuando el profesional inicia sesion por primera vez
     * reconciliamos ambos identificadores para que pueda activarse, publicarse en el directorio
     * y recibir solicitudes.
     *
     * @return el perfil actualizado, o vacío cuando el usuario no tiene perfil profesional.
     */
    public java.util.Optional<ProfesionalResponse> vincularIdentidad(UUID usuarioId, UUID keycloakId) {
        Profesional profesional = profesionalRepository.findByUsuarioId(usuarioId).orElse(null);
        if (profesional != null) {
            return java.util.Optional.of(toResponse(profesional));
        }
        if (keycloakId == null) {
            return java.util.Optional.empty();
        }
        return profesionalRepository.findByUsuarioId(keycloakId)
                .map(heredado -> {
                    heredado.setUsuarioId(usuarioId);
                    return toResponse(heredado);
                });
    }

    @Transactional(readOnly = true)
    public ProfesionalResponse buscarPorId(UUID id) {
        return toResponse(findProfesional(id));
    }

    @Transactional(readOnly = true)
    public List<ProfesionalResponse> listarTodos() {
        return profesionalRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ProfesionalResponse> listarActivos() {
        return profesionalRepository.findByEstado(EstadoProfesional.ACTIVO).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ProfesionalResponse> listarPorEstado(EstadoProfesional estado) {
        return profesionalRepository.findByEstado(estado).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ProfesionalResponse> listarPorUsuarioIds(List<UUID> usuarioIds) {
        if (usuarioIds == null || usuarioIds.isEmpty()) {
            return List.of();
        }
        return profesionalRepository.findByUsuarioIdInOrIdIn(usuarioIds, usuarioIds).stream().map(this::toResponse).toList();
    }

    public ProfesionalResponse activarPorUsuario(ActivarProfesionalRequest request) {
        UUID usuarioId = request.usuarioId();
        Profesional profesional = profesionalRepository.findByUsuarioId(usuarioId).orElse(null);
        if (profesional == null && request.keycloakId() != null) {
            // El padron pudo haberse sembrado con el id de Keycloak: adoptamos la identidad nueva.
            profesional = profesionalRepository.findByUsuarioId(request.keycloakId()).orElse(null);
            if (profesional != null) {
                profesional.setUsuarioId(usuarioId);
            }
        }
        if (profesional == null) {
            // Profesional sin legajo previo: generamos uno provisorio y se autogestiona su activacion.
            profesional = profesionalRepository.save(
                    new Profesional(usuarioId, legajoProvisorio(), EstadoProfesional.CARGADO));
        }
        if (profesional.getEstado() == EstadoProfesional.SUSPENDIDO) {
            throw conflict("Un profesional suspendido no puede activarse desde este flujo");
        }
        if (request.especialidadIds() != null && !request.especialidadIds().isEmpty()) {
            profesional.setEspecialidades(request.especialidadIds().stream()
                    .map(this::findEspecialidad)
                    .collect(Collectors.toSet()));
        }
        if (profesional.getEspecialidades().isEmpty()) {
            List<Especialidad> disponibles = especialidadRepository.findAll();
            if (!disponibles.isEmpty()) {
                profesional.setEspecialidades(new HashSet<>(disponibles.subList(0, 1)));
            } else {
                throw conflict("Elegi al menos una especialidad para activar tu perfil profesional");
            }
        }
        profesional.activar(request.fotoUrl(), request.zonaCoberturaLat(), request.zonaCoberturaLng(), request.radioKm());
        return toResponse(profesional);
    }

    private String legajoProvisorio() {
        String legajo;
        do {
            legajo = "PRO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (profesionalRepository.existsByLegajoIgnoreCase(legajo));
        return legajo;
    }

    public ProfesionalResponse activar(UUID id, ActivarProfesionalRequest request) {
        Profesional profesional = findProfesional(id);
        if (profesional.getEstado() == EstadoProfesional.SUSPENDIDO) {
            throw conflict("Un profesional suspendido no puede activarse desde este flujo");
        }
        profesional.activar(request.fotoUrl(), request.zonaCoberturaLat(), request.zonaCoberturaLng(), request.radioKm());
        return toResponse(profesional);
    }

    public ProfesionalResponse suspender(UUID id) {
        Profesional profesional = findProfesional(id);
        profesional.suspender();
        return toResponse(profesional);
    }

    public ProfesionalResponse reactivar(UUID id) {
        Profesional profesional = findProfesional(id);
        profesional.reactivar();
        return toResponse(profesional);
    }

    public ProfesionalResponse actualizar(UUID id, CrearProfesionalRequest request) {
        Profesional profesional = findProfesional(id);
        if (!profesional.getLegajo().equalsIgnoreCase(request.legajo())
                && profesionalRepository.existsByLegajoIgnoreCase(request.legajo())) {
            throw conflict("El legajo ya esta registrado");
        }
        if (!profesional.getUsuarioId().equals(request.usuarioId())) {
            throw conflict("No se puede cambiar el usuario de un perfil existente");
        }
        profesional.setLegajo(request.legajo().trim());
        profesional.setEspecialidades(request.especialidadIds().stream().map(this::findEspecialidad).collect(Collectors.toSet()));
        return toResponse(profesional);
    }

    public void eliminar(UUID id) {
        Profesional profesional = findProfesional(id);
        disponibilidadRepository.deleteByProfesionalId(id);
        profesionalRepository.delete(profesional);
        profesionalRepository.flush();
    }

    private Profesional findProfesional(UUID id) {
        return profesionalRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
    }

    private Especialidad findEspecialidad(UUID id) {
        return especialidadRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Especialidad no encontrada: " + id));
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private ProfesionalResponse toResponse(Profesional profesional) {
        Set<EspecialidadResponse> especialidades = profesional.getEspecialidades().stream()
                .map(item -> new EspecialidadResponse(item.getId(), item.getNombre()))
                .collect(Collectors.toSet());
        return new ProfesionalResponse(
                profesional.getId(), profesional.getUsuarioId(), profesional.getLegajo(), profesional.getFotoUrl(),
                profesional.getZonaCoberturaLat(), profesional.getZonaCoberturaLng(), profesional.getRadioKm(),
                profesional.getEstado(), profesional.getFechaCarga(), profesional.getFechaActivacion(), especialidades);
    }
}

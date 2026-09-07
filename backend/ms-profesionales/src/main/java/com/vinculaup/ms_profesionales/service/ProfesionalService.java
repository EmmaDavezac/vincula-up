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

    public ProfesionalService(ProfesionalRepository profesionalRepository, EspecialidadRepository especialidadRepository) {
        this.profesionalRepository = profesionalRepository;
        this.especialidadRepository = especialidadRepository;
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

    @Transactional(readOnly = true)
    public List<ProfesionalResponse> listarActivos() {
        return profesionalRepository.findByEstado(EstadoProfesional.ACTIVO).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ProfesionalResponse> listarPorEstado(EstadoProfesional estado) {
        return profesionalRepository.findByEstado(estado).stream().map(this::toResponse).toList();
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

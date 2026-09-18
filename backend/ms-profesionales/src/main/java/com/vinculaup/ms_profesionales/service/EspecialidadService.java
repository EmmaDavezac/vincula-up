package com.vinculaup.ms_profesionales.service;

import com.vinculaup.ms_profesionales.dto.EspecialidadResponse;
import com.vinculaup.ms_profesionales.dto.CrearEspecialidadRequest;
import com.vinculaup.ms_profesionales.entity.Especialidad;
import com.vinculaup.ms_profesionales.repository.EspecialidadRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EspecialidadService {

    private final EspecialidadRepository repository;

    public EspecialidadService(EspecialidadRepository repository) {
        this.repository = repository;
    }

    public List<EspecialidadResponse> listar() {
        return repository.findAll().stream().map(item -> new EspecialidadResponse(item.getId(), item.getNombre())).toList();
    }

    public EspecialidadResponse actualizar(java.util.UUID id, CrearEspecialidadRequest request) {
        Especialidad especialidad = repository.findById(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Especialidad no encontrada"));
        especialidad.setNombre(request.nombre().trim());
        return new EspecialidadResponse(especialidad.getId(), especialidad.getNombre());
    }

    public void eliminar(java.util.UUID id) {
        Especialidad especialidad = repository.findById(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Especialidad no encontrada"));
        try {
            repository.delete(especialidad);
            repository.flush();
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "La especialidad está asignada a profesionales", ex);
        }
    }

    public EspecialidadResponse crear(CrearEspecialidadRequest request) {
        Especialidad especialidad = repository.save(new Especialidad(request.nombre()));
        return new EspecialidadResponse(especialidad.getId(), especialidad.getNombre());
    }
}

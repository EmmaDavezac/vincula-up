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

    public EspecialidadResponse crear(CrearEspecialidadRequest request) {
        Especialidad especialidad = repository.save(new Especialidad(request.nombre()));
        return new EspecialidadResponse(especialidad.getId(), especialidad.getNombre());
    }
}

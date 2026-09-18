package com.vinculaup.ms_profesionales.controller;

import com.vinculaup.ms_profesionales.dto.CrearEspecialidadRequest;
import com.vinculaup.ms_profesionales.dto.EspecialidadResponse;
import com.vinculaup.ms_profesionales.service.EspecialidadService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/especialidades")
public class EspecialidadController {

    private final EspecialidadService service;

    public EspecialidadController(EspecialidadService service) {
        this.service = service;
    }

    @GetMapping
    public List<EspecialidadResponse> listar() {
        return service.listar();
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    public EspecialidadResponse actualizar(@org.springframework.web.bind.annotation.PathVariable java.util.UUID id,
            @Valid @RequestBody CrearEspecialidadRequest request) {
        return service.actualizar(id, request);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@org.springframework.web.bind.annotation.PathVariable java.util.UUID id) {
        service.eliminar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EspecialidadResponse crear(@Valid @RequestBody CrearEspecialidadRequest request) {
        return service.crear(request);
    }
}
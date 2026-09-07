package com.vinculaup.ms_profesionales.controller;

import com.vinculaup.ms_profesionales.dto.ActivarProfesionalRequest;
import com.vinculaup.ms_profesionales.dto.CrearProfesionalRequest;
import com.vinculaup.ms_profesionales.dto.ProfesionalResponse;
import com.vinculaup.ms_profesionales.entity.EstadoProfesional;
import com.vinculaup.ms_profesionales.service.ProfesionalService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profesionales")
public class ProfesionalController {

    private final ProfesionalService service;

    public ProfesionalController(ProfesionalService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProfesionalResponse crear(@Valid @RequestBody CrearProfesionalRequest request) {
        return service.crear(request);
    }

    @GetMapping
    public List<ProfesionalResponse> listar(@RequestParam(required = false) EstadoProfesional estado) {
        return estado == null ? service.listarActivos() : service.listarPorEstado(estado);
    }

    @PatchMapping("/{id}/activar")
    public ProfesionalResponse activar(@PathVariable UUID id, @Valid @RequestBody ActivarProfesionalRequest request) {
        return service.activar(id, request);
    }

    @PatchMapping("/{id}/suspender")
    public ProfesionalResponse suspender(@PathVariable UUID id) {
        return service.suspender(id);
    }
}
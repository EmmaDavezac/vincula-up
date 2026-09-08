package com.vinculaup.ms_profesionales.controller;

import com.vinculaup.ms_profesionales.dto.DisponibilidadRequest;
import com.vinculaup.ms_profesionales.dto.DisponibilidadResponse;
import com.vinculaup.ms_profesionales.service.DisponibilidadService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profesionales/{profesionalId}/disponibilidad")
public class DisponibilidadController {

    private final DisponibilidadService service;

    public DisponibilidadController(DisponibilidadService service) {
        this.service = service;
    }

    @GetMapping
    public List<DisponibilidadResponse> listar(@PathVariable UUID profesionalId) {
        return service.listar(profesionalId);
    }

    @PutMapping
    public List<DisponibilidadResponse> reemplazar(
            @PathVariable UUID profesionalId,
            @Valid @RequestBody List<@Valid DisponibilidadRequest> requests) {
        return service.reemplazar(profesionalId, requests);
    }
}

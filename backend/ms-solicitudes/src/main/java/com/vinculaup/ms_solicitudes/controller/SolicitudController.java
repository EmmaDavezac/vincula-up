package com.vinculaup.ms_solicitudes.controller;

import com.vinculaup.ms_solicitudes.dto.CrearSolicitudRequest;
import com.vinculaup.ms_solicitudes.dto.SolicitudResponse;
import com.vinculaup.ms_solicitudes.service.SolicitudService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/solicitudes")
public class SolicitudController {

    private final SolicitudService service;

    public SolicitudController(SolicitudService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SolicitudResponse crear(@Valid @RequestBody CrearSolicitudRequest request) {
        return service.crear(request);
    }

    @GetMapping("/mias")
    public List<SolicitudResponse> listarPropias(@RequestParam UUID usuarioId) {
        return service.listarPropias(usuarioId);
    }
}

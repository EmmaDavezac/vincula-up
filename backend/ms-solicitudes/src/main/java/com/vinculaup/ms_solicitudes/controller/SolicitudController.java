package com.vinculaup.ms_solicitudes.controller;

import com.vinculaup.ms_solicitudes.dto.CrearSolicitudRequest;
import com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest;
import com.vinculaup.ms_solicitudes.dto.SolicitudResponse;
import com.vinculaup.ms_solicitudes.service.SolicitudService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
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

    /**
     * Solicitudes del usuario autenticado. {@code aliasIds} permite incluir identidades
     * alternativas del mismo usuario (por ejemplo su {@code keycloakId} cuando el padron
     * profesional todavía no fue reconciliado).
     */
    @GetMapping("/mias")
    public List<SolicitudResponse> listarPropias(
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) List<UUID> aliasIds,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String rol) {
        return service.listarPropias(usuarioId, aliasIds, tipo, rol);
    }

    @PatchMapping("/{id}/aceptar")
    public SolicitudResponse aceptar(@PathVariable UUID id, @Valid @RequestBody CambiarEstadoRequest request) {
        return service.aceptar(id, request);
    }

    @PatchMapping("/{id}/rechazar")
    public SolicitudResponse rechazar(@PathVariable UUID id, @Valid @RequestBody CambiarEstadoRequest request) {
        return service.rechazar(id, request);
    }

    @PatchMapping("/{id}/completar")
    public SolicitudResponse completar(@PathVariable UUID id, @Valid @RequestBody CambiarEstadoRequest request) {
        return service.completar(id, request);
    }

    @PatchMapping("/{id}/cancelar")
    public SolicitudResponse cancelar(@PathVariable UUID id, @Valid @RequestBody CambiarEstadoRequest request) {
        return service.cancelar(id, request);
    }
}

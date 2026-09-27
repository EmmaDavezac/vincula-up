package com.vinculaup.ms_profesionales.controller;

import com.vinculaup.ms_profesionales.dto.ActivarProfesionalRequest;
import com.vinculaup.ms_profesionales.dto.CrearProfesionalRequest;
import com.vinculaup.ms_profesionales.dto.ProfesionalResponse;
import com.vinculaup.ms_profesionales.dto.VincularIdentidadRequest;
import com.vinculaup.ms_profesionales.entity.EstadoProfesional;
import com.vinculaup.ms_profesionales.service.ProfesionalService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    public ProfesionalResponse actualizar(@PathVariable UUID id, @Valid @RequestBody CrearProfesionalRequest request) {
        return service.actualizar(id, request);
    }

    @GetMapping("/{id}")
    public ProfesionalResponse buscarPorId(@PathVariable UUID id) {
        return service.buscarPorId(id);
    }

    @GetMapping
    public List<ProfesionalResponse> listar(
            @RequestParam(required = false) EstadoProfesional estado,
            @RequestParam(required = false) Boolean todos) {
        if (Boolean.TRUE.equals(todos)) {
            return service.listarTodos();
        }
        return estado == null ? service.listarActivos() : service.listarPorEstado(estado);
    }

    /** Perfiles profesionales para un conjunto de usuarios (usado para mapear solicitudes <> padron). */
    @GetMapping("/por-usuario")
    public List<ProfesionalResponse> listarPorUsuarioIds(@RequestParam(required = false) List<UUID> usuarioIds) {
        return service.listarPorUsuarioIds(usuarioIds == null ? List.of() : usuarioIds);
    }

    /**
     * Perfil profesional del usuario logueado. Devuelve {@code 204} cuando todavía no existe,
     * así el frontend puede exigir la activación la primera vez.
     */
    @GetMapping("/mi-perfil")
    public ResponseEntity<ProfesionalResponse> miPerfil(
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) UUID keycloakId) {
        return service.buscarPorIdentidad(usuarioId, keycloakId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Reconciliación de identidades: el padron puede estar sembrado con el {@code keycloakId}
     * como {@code usuarioId}. Devuelve {@code 204} cuando el usuario no tiene perfil profesional.
     */
    @PostMapping("/vincular")
    public ResponseEntity<ProfesionalResponse> vincular(@Valid @RequestBody VincularIdentidadRequest request) {
        return service.vincularIdentidad(request.usuarioId(), request.keycloakId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @org.springframework.web.bind.annotation.RequestMapping(value = "/activar", method = {org.springframework.web.bind.annotation.RequestMethod.PATCH, org.springframework.web.bind.annotation.RequestMethod.POST, org.springframework.web.bind.annotation.RequestMethod.PUT})
    public ProfesionalResponse activarPorUsuario(@Valid @RequestBody ActivarProfesionalRequest request) {
        return service.activarPorUsuario(request);
    }

    @PatchMapping("/{id}/activar")
    public ProfesionalResponse activar(@PathVariable UUID id, @Valid @RequestBody ActivarProfesionalRequest request) {
        return service.activar(id, request);
    }

    @PatchMapping("/{id}/suspender")
    public ProfesionalResponse suspender(@PathVariable UUID id) {
        return service.suspender(id);
    }

    @PatchMapping("/{id}/reactivar")
    public ProfesionalResponse reactivar(@PathVariable UUID id) {
        return service.reactivar(id);
    }
}
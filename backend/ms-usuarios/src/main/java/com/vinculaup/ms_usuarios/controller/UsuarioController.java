package com.vinculaup.ms_usuarios.controller;

import com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.CrearUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.UsuarioResponse;
import com.vinculaup.ms_usuarios.service.UsuarioService;
import jakarta.validation.Valid;
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
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse crear(@Valid @RequestBody CrearUsuarioRequest request) {
        return service.crear(request);
    }

    @GetMapping("/{id}")
    public UsuarioResponse buscarPorId(@PathVariable UUID id) {
        return service.buscarPorId(id);
    }

    @GetMapping("/por-keycloak")
    public UsuarioResponse buscarPorKeycloakId(@RequestParam UUID keycloakId) {
        return service.buscarPorKeycloakId(keycloakId);
    }

    @PatchMapping("/{id}")
    public UsuarioResponse actualizar(@PathVariable UUID id, @Valid @RequestBody ActualizarUsuarioRequest request) {
        return service.actualizar(id, request);
    }
}

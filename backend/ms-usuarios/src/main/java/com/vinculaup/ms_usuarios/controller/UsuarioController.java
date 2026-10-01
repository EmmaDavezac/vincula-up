package com.vinculaup.ms_usuarios.controller;

import com.vinculaup.ms_usuarios.dto.AceptarTerminosRequest;
import com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.CrearUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.UsuarioResponse;
import com.vinculaup.ms_usuarios.entity.EstadoUsuario;
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

import com.vinculaup.ms_usuarios.entity.RolNegocio;
import java.util.List;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    public List<UsuarioResponse> listar(
            @RequestParam(required = false) RolNegocio rol,
            @RequestParam(required = false) EstadoUsuario estado) {
        return service.listar(rol, estado);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse crear(@Valid @RequestBody CrearUsuarioRequest request) {
        return service.crear(request);
    }

    /** Búsqueda por email: permite detectar invitaciones pendientes antes de dar de alta. */
    @GetMapping("/por-email")
    public UsuarioResponse buscarPorEmail(@RequestParam String email) {
        return service.buscarPorEmail(email);
    }

    /**
     * Registro de la aceptación de los términos. El id lo resuelve el BFF desde el
     * token: acá no se valida nada, es un microservicio interno.
     */
    @PatchMapping("/{id}/terminos")
    public UsuarioResponse aceptarTerminos(@PathVariable UUID id, @RequestBody AceptarTerminosRequest request) {
        return service.aceptarTerminos(id, request.version());
    }

    @GetMapping("/{id}")
    public UsuarioResponse buscarPorId(@PathVariable UUID id) {
        return service.buscarPorId(id);
    }

    /** Baneo administrativo: deja la cuenta suspendida (reversible). */
    @PatchMapping("/{id}/suspender")
    public UsuarioResponse suspender(@PathVariable UUID id) {
        return service.suspender(id);
    }

    /** Levanta el baneo y devuelve la cuenta a ACTIVO. */
    @PatchMapping("/{id}/reactivar")
    public UsuarioResponse reactivar(@PathVariable UUID id) {
        return service.reactivar(id);
    }

    @GetMapping("/por-keycloak")
    public UsuarioResponse buscarPorKeycloakId(
            @RequestParam UUID keycloakId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String apellido,
            @RequestParam(required = false) RolNegocio rol) {
        return service.buscarPorKeycloakIdOAutoCrear(keycloakId, email, nombre, apellido, rol);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable UUID id) {
        service.eliminar(id);
    }

    @PatchMapping("/{id}")
    public UsuarioResponse actualizar(@PathVariable UUID id, @Valid @RequestBody ActualizarUsuarioRequest request) {
        return service.actualizar(id, request);
    }
}

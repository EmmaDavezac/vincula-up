package com.vinculaup.ms_usuarios.service;

import com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.CrearUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.UsuarioResponse;
import com.vinculaup.ms_usuarios.entity.RolNegocio;
import com.vinculaup.ms_usuarios.entity.Usuario;
import com.vinculaup.ms_usuarios.repository.UsuarioRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class UsuarioService {

    private final UsuarioRepository repository;

    public UsuarioService(UsuarioRepository repository) {
        this.repository = repository;
    }

    public UsuarioResponse crear(CrearUsuarioRequest request) {
        if (repository.findByKeycloakId(request.keycloakId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El usuario de Keycloak ya esta registrado");
        }
        if (repository.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya esta registrado");
        }

        Usuario usuario = new Usuario(
                request.keycloakId(),
                request.nombre(),
                request.apellido(),
                request.email(),
                request.telefono(),
                request.rolNegocio());
        return toResponse(repository.save(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorId(UUID id) {
        return repository.findById(id).map(this::toResponse).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorKeycloakId(UUID keycloakId) {
        return repository.findByKeycloakId(keycloakId).map(this::toResponse).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    public UsuarioResponse buscarPorKeycloakIdOAutoCrear(UUID keycloakId, String email, String nombre, String apellido, RolNegocio rol) {
        return repository.findByKeycloakId(keycloakId).map(this::toResponse).orElseGet(() -> {
            if (email != null && !email.isBlank()) {
                // If email already exists, link keycloakId
                var byEmail = repository.findByEmailIgnoreCase(email.trim());
                if (byEmail.isPresent()) {
                    Usuario existing = byEmail.get();
                    existing.setKeycloakId(keycloakId);
                    return toResponse(existing);
                }
                // Auto-create user from Keycloak claims
                RolNegocio finalRol = rol != null ? rol : RolNegocio.CLIENTE;
                String finalNombre = nombre != null && !nombre.isBlank() ? nombre.trim() : "Usuario";
                String finalApellido = apellido != null ? apellido.trim() : "";
                Usuario newUser = new Usuario(keycloakId, finalNombre, finalApellido, email.trim().toLowerCase(), "", finalRol);
                return toResponse(repository.save(newUser));
            }
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado para Keycloak ID: " + keycloakId);
        });
    }

    @Transactional(readOnly = true)
    public java.util.List<UsuarioResponse> listar(RolNegocio rol) {
        if (rol != null) {
            return repository.findByRolNegocio(rol).stream().map(this::toResponse).toList();
        }
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    public UsuarioResponse actualizar(UUID id, ActualizarUsuarioRequest request) {
        Usuario usuario = repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        usuario.update(request.nombre(), request.apellido(), request.email(), request.telefono(), request.fotoUrl());
        return toResponse(usuario);
    }

    public void eliminar(UUID id) {
        Usuario usuario = repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        repository.delete(usuario);
    }

    private UsuarioResponse toResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getKeycloakId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getTelefono(),
                usuario.getFotoUrl(),
                usuario.getRolNegocio(),
                usuario.getFechaAlta());
    }
}

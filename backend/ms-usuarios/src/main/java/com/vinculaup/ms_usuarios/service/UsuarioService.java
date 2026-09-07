package com.vinculaup.ms_usuarios.service;

import com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.CrearUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.UsuarioResponse;
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

    public UsuarioResponse actualizar(UUID id, ActualizarUsuarioRequest request) {
        Usuario usuario = repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        usuario.update(request.nombre(), request.apellido(), request.email(), request.telefono(), request.fotoUrl());
        return toResponse(usuario);
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

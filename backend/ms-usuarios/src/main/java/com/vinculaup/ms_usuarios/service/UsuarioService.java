package com.vinculaup.ms_usuarios.service;

import com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.CrearUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.UsuarioResponse;
import com.vinculaup.ms_usuarios.entity.EstadoUsuario;
import com.vinculaup.ms_usuarios.entity.RolNegocio;
import com.vinculaup.ms_usuarios.entity.Usuario;
import com.vinculaup.ms_usuarios.repository.UsuarioRepository;
import java.util.List;
import java.util.Locale;
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

    /**
     * Alta de usuario. Cuando {@code keycloakId} viene nulo se trata de una
     * <b>invitación</b>: el administrador precargó los datos (típicamente de un
     * profesional) y la cuenta de Keycloak se vincula sola en el primer login.
     */
    public UsuarioResponse crear(CrearUsuarioRequest request) {
        if (request.keycloakId() != null && repository.findByKeycloakId(request.keycloakId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El usuario de Keycloak ya esta registrado");
        }
        if (repository.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El email ya esta registrado");
        }

        Usuario usuario = new Usuario(
                request.keycloakId(),
                request.nombre(),
                request.apellido(),
                request.email().trim().toLowerCase(Locale.ROOT),
                request.telefono(),
                request.rolNegocio());
        return toResponse(repository.save(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El email es obligatorio");
        }
        return repository.findByEmailIgnoreCase(email.trim()).map(this::toResponse).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    public UsuarioResponse suspender(UUID id) {
        Usuario usuario = findUsuario(id);
        usuario.suspender();
        return toResponse(usuario);
    }

    public UsuarioResponse reactivar(UUID id) {
        Usuario usuario = findUsuario(id);
        usuario.reactivar();
        return toResponse(usuario);
    }

    private Usuario findUsuario(UUID id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
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

    /**
     * Resuelve la cuenta de alguien que acaba de autenticarse en Keycloak.
     * <p>
     * El rol de negocio se decide <b>solo por el padrón</b>: si el email ya
     * estaba cargado por el administrador (prerregistro) la cuenta se vincula y
     * conserva su PROFESIONAL; si el email no está en el padrón, la cuenta nueva
     * nace como CLIENTE.
     * <p>
     * Antes, al auto-crear, el rol se tomaba del claim del token de Keycloak
     * ({@code rol}). Eso dejaba el prerregistro en manos de la configuración de
     * Keycloak: si el token decía PROFESIONAL, cualquiera entraba como
     * profesional sin pasar por el padrón. El parámetro {@code rol} se conserva
     * para los usuarios que ya existían, pero ya no decide altas.
     */
    public UsuarioResponse buscarPorKeycloakIdOAutoCrear(UUID keycloakId, String email, String nombre, String apellido, RolNegocio rol) {
        return repository.findByKeycloakId(keycloakId).map(this::toResponse).orElseGet(() -> {
            if (email != null && !email.isBlank()) {
                // If email already exists, link keycloakId
                var byEmail = repository.findByEmailIgnoreCase(email.trim());
                if (byEmail.isPresent()) {
                    Usuario existing = byEmail.get();
                    existing.setKeycloakId(keycloakId);
                    existing.completarDatosPersonales(nombre, apellido);
                    return toResponse(existing);
                }
                // Auto-create user from Keycloak claims.
                // CLIENTE es el único rol que se concede sin pasar por el padrón.
                String finalNombre = nombre != null && !nombre.isBlank() ? nombre.trim() : "Usuario";
                String finalApellido = apellido != null ? apellido.trim() : "";
                Usuario newUser = new Usuario(keycloakId, finalNombre, finalApellido, email.trim().toLowerCase(Locale.ROOT), "", RolNegocio.CLIENTE);
                return toResponse(repository.save(newUser));
            }
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado para Keycloak ID: " + keycloakId);
        });
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listar(RolNegocio rol, EstadoUsuario estado) {
        if (rol != null && estado != null) {
            return repository.findByRolNegocioAndEstado(rol, estado).stream().map(this::toResponse).toList();
        }
        return repository.findAll().stream()
                .filter(usuario -> rol == null || usuario.getRolNegocio() == rol)
                .filter(usuario -> estado == null || usuario.getEstado() == estado)
                .map(this::toResponse)
                .toList();
    }

    public UsuarioResponse actualizar(UUID id, ActualizarUsuarioRequest request) {
        // Un PATCH que no trae ningún cambio efectivo (todo nulo o en blanco,
        // sin pedido de quitar la foto) es un error del cliente, no un guardado.
        // Ojo: fotoUrl "" sí es un cambio (quita la foto guardada).
        boolean tieneCambios = (request.nombre() != null && !request.nombre().isBlank())
                || (request.apellido() != null && !request.apellido().isBlank())
                || (request.email() != null && !request.email().isBlank())
                || (request.telefono() != null && !request.telefono().isBlank())
                || request.fotoUrl() != null;
        if (!tieneCambios) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No hay cambios para aplicar");
        }
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
                usuario.getEstado(),
                usuario.getFechaAlta());
    }
}

package com.vinculaup.ms_usuarios.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vinculaup.ms_usuarios.dto.CrearUsuarioRequest;
import com.vinculaup.ms_usuarios.dto.UsuarioResponse;
import com.vinculaup.ms_usuarios.entity.EstadoUsuario;
import com.vinculaup.ms_usuarios.entity.RolNegocio;
import com.vinculaup.ms_usuarios.entity.Usuario;
import com.vinculaup.ms_usuarios.repository.UsuarioRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Reglas del padrón de usuarios: invitación de profesionales (sin cuenta
 * Keycloak) y baneo reversible de clientes.
 */
class UsuarioServiceTest {

    private UsuarioRepository repository;
    private UsuarioService service;

    @BeforeEach
    void setUp() {
        repository = mock(UsuarioRepository.class);
        service = new UsuarioService(repository);
    }

    @Test
    void invitaProfesionalSinCuentaKeycloak() {
        CrearUsuarioRequest request = new CrearUsuarioRequest(
                null, "Luciano", "Benitez", "Luciano.Benitez@vincula-up.local", "3442-555555", RolNegocio.PROFESIONAL);
        when(repository.existsByEmailIgnoreCase(request.email())).thenReturn(false);
        when(repository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UsuarioResponse response = service.crear(request);

        assertNull(response.keycloakId(), "la invitación todavía no tiene identidad Keycloak");
        assertEquals(RolNegocio.PROFESIONAL, response.rolNegocio());
        assertEquals(EstadoUsuario.ACTIVO, response.estado());
        assertEquals("luciano.benitez@vincula-up.local", response.email(), "el email se normaliza a minúsculas");
    }

    @Test
    void rechazaInvitacionConEmailDuplicado() {
        CrearUsuarioRequest request = new CrearUsuarioRequest(
                null, "Luciano", "Benitez", "luciano@vincula-up.local", "", RolNegocio.PROFESIONAL);
        when(repository.existsByEmailIgnoreCase(request.email())).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.crear(request));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("email"));
        verify(repository, never()).save(any());
    }

    @Test
    void vinculaLaIdentidadKeycloakAlReconocerElEmailInvitado() {
        Usuario invitado = new Usuario(null, null, null, "luciano@vincula-up.local", "", RolNegocio.PROFESIONAL);
        UUID keycloakId = UUID.randomUUID();
        when(repository.findByKeycloakId(keycloakId)).thenReturn(Optional.empty());
        when(repository.findByEmailIgnoreCase("luciano@vincula-up.local")).thenReturn(Optional.of(invitado));

        UsuarioResponse response = service.buscarPorKeycloakIdOAutoCrear(
                keycloakId, "luciano@vincula-up.local", "Luciano", "Benitez", RolNegocio.CLIENTE);

        assertEquals(keycloakId, response.keycloakId());
        // El rol del padrón manda: el profesional invitado no queda como cliente.
        assertEquals(RolNegocio.PROFESIONAL, response.rolNegocio());
        assertEquals("Luciano", response.nombre());
        assertEquals("Benitez", response.apellido());
    }

    @Test
    void baneaYLevantaElBaneoDeUnCliente() {
        UUID id = UUID.randomUUID();
        Usuario cliente = new Usuario(id, UUID.randomUUID(), "Sofia", "Gomez", "sofia@vincula-up.local", "", RolNegocio.CLIENTE);
        when(repository.findById(id)).thenReturn(Optional.of(cliente));

        assertEquals(EstadoUsuario.SUSPENDIDO, service.suspender(id).estado());
        assertTrue(cliente.isSuspendido());

        assertEquals(EstadoUsuario.ACTIVO, service.reactivar(id).estado());
    }

    @Test
    void unaFilaSinEstadoSeInterpretaComoActiva() {
        Usuario legado = new Usuario(null, UUID.randomUUID(), "Viejo", "Registro", "viejo@vincula-up.local", "", RolNegocio.CLIENTE);

        assertEquals(EstadoUsuario.ACTIVO, legado.getEstado());
        assertTrue(!legado.isSuspendido());
    }

    @Test
    void actualizarMiCuentaNuncaBorraElEmail() {
        UUID id = UUID.randomUUID();
        Usuario cuenta = new Usuario(id, UUID.randomUUID(), "Sofia", "Gomez", "sofia@vincula-up.local", "3764", RolNegocio.CLIENTE);
        when(repository.findById(id)).thenReturn(Optional.of(cuenta));

        UsuarioResponse actualizada = service.actualizar(id, new com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest(
                "Sofia Belen", null, null, "3764 99-9999", null));

        assertEquals("sofia@vincula-up.local", actualizada.email(), "el email no se borra con nulos");
        assertEquals("Sofia Belen", actualizada.nombre());
        assertEquals("Gomez", actualizada.apellido(), "el apellido se conserva en actualización parcial");
        assertEquals("3764 99-9999", actualizada.telefono());
    }

    @Test
    void actualizarSoloLaFotoNoPisaNiExigeElResto() {
        UUID id = UUID.randomUUID();
        Usuario cuenta = new Usuario(id, UUID.randomUUID(), "Sofia", "Gomez", "sofia@vincula-up.local", "3764", RolNegocio.CLIENTE);
        when(repository.findById(id)).thenReturn(Optional.of(cuenta));

        UsuarioResponse actualizada = service.actualizar(id, new com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest(
                null, null, null, null, "data:image/png;base64,abc"));

        assertEquals("Sofia", actualizada.nombre(), "el nombre se conserva al guardar solo la foto");
        assertEquals("Gomez", actualizada.apellido(), "el apellido se conserva al guardar solo la foto");
        assertEquals("3764", actualizada.telefono(), "el teléfono se conserva al guardar solo la foto");
        assertEquals("data:image/png;base64,abc", actualizada.fotoUrl());
    }

    @Test
    void losBlanksSeIgnoranYNoBorranDatos() {
        UUID id = UUID.randomUUID();
        Usuario cuenta = new Usuario(id, UUID.randomUUID(), "Sofia", "Gomez", "sofia@vincula-up.local", "3764", RolNegocio.CLIENTE);
        when(repository.findById(id)).thenReturn(Optional.of(cuenta));

        // Cambia solo el apellido; el resto llega en blanco y no debe pisar nada.
        UsuarioResponse actualizada = service.actualizar(id, new com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest(
                "  ", "Gomez Ibarra", " ", "   ", null));

        assertEquals("Sofia", actualizada.nombre());
        assertEquals("Gomez Ibarra", actualizada.apellido());
        assertEquals("sofia@vincula-up.local", actualizada.email());
        assertEquals("3764", actualizada.telefono());
    }

    @Test
    void unPatchSinNingunCambioSeRechazaCon400() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(new Usuario(
                id, UUID.randomUUID(), "Sofia", "Gomez", "sofia@vincula-up.local", "3764", RolNegocio.CLIENTE)));

        var excepcion = assertThrows(ResponseStatusException.class, () ->
                service.actualizar(id, new com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest(
                        null, null, null, null, null)));

        assertEquals(HttpStatus.BAD_REQUEST, excepcion.getStatusCode());
        verify(repository, never()).save(any());
    }

    @Test
    void quitarLaFotoEsUnCambioValidoAunqueElRestoVengaVacio() {
        UUID id = UUID.randomUUID();
        Usuario cuenta = new Usuario(id, UUID.randomUUID(), "Sofia", "Gomez", "sofia@vincula-up.local", "3764", RolNegocio.CLIENTE);
        cuenta.update(null, null, null, null, "data:image/png;base64,abc");
        when(repository.findById(id)).thenReturn(Optional.of(cuenta));

        UsuarioResponse actualizada = service.actualizar(id, new com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest(
                null, null, null, null, ""));

        assertNull(actualizada.fotoUrl(), "fotoUrl vacío debe quitar la foto");
        assertEquals("Sofia", actualizada.nombre(), "el nombre se conserva al quitar la foto");
        assertEquals("3764", actualizada.telefono(), "el teléfono se conserva al quitar la foto");
    }
}
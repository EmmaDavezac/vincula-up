package com.vinculaup.ms_usuarios.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.vinculaup.ms_usuarios.dto.ActualizarUsuarioRequest;
import com.vinculaup.ms_usuarios.entity.EstadoUsuario;
import com.vinculaup.ms_usuarios.entity.RolNegocio;
import com.vinculaup.ms_usuarios.entity.Usuario;
import com.vinculaup.ms_usuarios.repository.SuscripcionPushRepository;
import com.vinculaup.ms_usuarios.repository.UsuarioRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class UsuarioServiceTest {

    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final UsuarioService service =
            new UsuarioService(usuarioRepository, mock(SuscripcionPushRepository.class));

    private final UUID usuarioId = UUID.randomUUID();
    private final Usuario usuario = new Usuario(
            UUID.randomUUID(), "Sofia", "Gomez", "sofia@example.test", "123", RolNegocio.CLIENTE);

    @BeforeEach
    void configuraUsuario() {
        ReflectionTestUtils.setField(usuario, "id", usuarioId);
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
    }

    @Test
    void actualizarPerfilNoPermiteCambiarElCorreoIdentitario() {
        var actualizado = service.actualizar(usuarioId, new ActualizarUsuarioRequest(
                "Sofía", null, "otro@example.test", "456", null));

        assertEquals("Sofía", actualizado.nombre());
        assertEquals("456", actualizado.telefono());
        assertEquals("sofia@example.test", actualizado.email());
    }

    @Test
    void aceptarTerminosRegistraVersionYFecha() {
        var actualizado = service.aceptarTerminos(usuarioId, "1.1");

        assertEquals("1.1", actualizado.terminosVersion());
        assertNotNull(actualizado.terminosAceptadoEn());
    }

    @Test
    void suspenderYReactivarConservaLaCuentaYAlternaSuEstado() {
        assertEquals(EstadoUsuario.SUSPENDIDO, service.suspender(usuarioId).estado());
        assertEquals(EstadoUsuario.ACTIVO, service.reactivar(usuarioId).estado());
    }

    @Test
    void rechazaUnPerfilVacioSinModificarLaCuenta() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.actualizar(usuarioId, new ActualizarUsuarioRequest(" ", null, null, null, null)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Sofia", usuario.getNombre());
    }
}

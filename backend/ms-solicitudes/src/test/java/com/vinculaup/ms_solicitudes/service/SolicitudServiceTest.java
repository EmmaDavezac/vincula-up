package com.vinculaup.ms_solicitudes.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vinculaup.ms_solicitudes.client.DisponibilidadProfesional;
import com.vinculaup.ms_solicitudes.client.GeocodingClient;
import com.vinculaup.ms_solicitudes.client.ProfesionalIdentidad;
import com.vinculaup.ms_solicitudes.client.ProfesionalesClient;
import com.vinculaup.ms_solicitudes.dto.CambiarEstadoRequest;
import com.vinculaup.ms_solicitudes.dto.CrearSolicitudRequest;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class SolicitudServiceTest {

    private SolicitudRepository repository;
    private ProfesionalesClient profesionalesClient;
    private GeocodingClient geocodingClient;
    private SolicitudService service;

    @BeforeEach
    void setUp() {
        repository = mock(SolicitudRepository.class);
        profesionalesClient = mock(ProfesionalesClient.class);
        geocodingClient = mock(GeocodingClient.class);
        service = new SolicitudService(repository, profesionalesClient, geocodingClient);
    }

    private Solicitud solicitud(UUID clienteId, UUID profesionalId) {
        return new Solicitud(clienteId, profesionalId, UUID.randomUUID(),
                "Calle 123", -34.60, -58.38, LocalDateTime.now().plusDays(1), "Se pierde el agua en la cocina.", null);
    }

    @ParameterizedTest
    @ValueSource(strings = {"CARGADO", "SUSPENDIDO"})
    void noPermiteAceptarSiElPerfilNoEstaActivo(String estado) {
        UUID id = UUID.randomUUID();
        UUID profId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        Solicitud solicitud = solicitud(UUID.randomUUID(), profId);
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));
        when(profesionalesClient.obtenerIdentidades(any()))
                .thenReturn(List.of(new ProfesionalIdentidad(profId, usuarioId, estado)));
        var ex = assertThrows(ResponseStatusException.class, () -> service.aceptar(id,
                new CambiarEstadoRequest(usuarioId, "")));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals(EstadoSolicitud.PENDIENTE, solicitud.getEstado());
    }

    @Test
    void soloElProfesionalActivoDuenoPuedeAceptarUnaVez() {
        UUID id = UUID.randomUUID();
        UUID profId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        Solicitud solicitud = solicitud(UUID.randomUUID(), profId);
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));
        when(profesionalesClient.obtenerIdentidades(any()))
                .thenReturn(List.of(new ProfesionalIdentidad(profId, usuarioId, "ACTIVO")));
        var ajeno = assertThrows(ResponseStatusException.class, () -> service.aceptar(id,
                new CambiarEstadoRequest(UUID.randomUUID(), "")));
        assertEquals(HttpStatus.FORBIDDEN, ajeno.getStatusCode());
        // El actor opera con su id de ms-usuarios aunque la solicitud guarde el id del perfil.
        var request = new CambiarEstadoRequest(usuarioId, "");
        assertEquals(EstadoSolicitud.ACEPTADA, service.aceptar(id, request).estado());
        var repetida = assertThrows(ResponseStatusException.class, () -> service.aceptar(id, request));
        assertEquals(HttpStatus.CONFLICT, repetida.getStatusCode());
    }

    /**
     * Regresión del bug "no funciona el aceptar solicitud recibida": las solicitudes históricas
     * quedaron guardadas con el {@code keycloakId} como {@code profesionalId}, así que el id del
     * perfil del padrón nunca aparecía y el aceptar respondía 403.
     */
    @Test
    void aceptaLaSolicitudAunqueEsteGuardadaConElKeycloakIdDelProfesional() {
        UUID id = UUID.randomUUID();
        UUID perfilId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        UUID keycloakId = UUID.randomUUID();
        Solicitud solicitud = solicitud(UUID.randomUUID(), keycloakId);
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));
        when(profesionalesClient.obtenerIdentidades(any()))
                .thenReturn(List.of(new ProfesionalIdentidad(perfilId, usuarioId, "ACTIVO")));

        var response = service.aceptar(id, new CambiarEstadoRequest(usuarioId, "", keycloakId));

        assertEquals(EstadoSolicitud.ACEPTADA, response.estado());
        assertEquals(EstadoSolicitud.ACEPTADA, solicitud.getEstado());
    }

    @Test
    void noPermiteAceptarLaSolicitudDeOtroProfesional() {
        UUID id = UUID.randomUUID();
        UUID profId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        UUID otroProfesionalId = UUID.randomUUID();
        Solicitud solicitud = solicitud(UUID.randomUUID(), otroProfesionalId);
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));
        when(profesionalesClient.obtenerIdentidades(any()))
                .thenReturn(List.of(new ProfesionalIdentidad(profId, usuarioId, "ACTIVO")));

        var ex = assertThrows(ResponseStatusException.class, () -> service.aceptar(id,
                new CambiarEstadoRequest(usuarioId, "")));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals(EstadoSolicitud.PENDIENTE, solicitud.getEstado());
    }


    @Test
    void rechazaSolicitudSiProfesionalNoExiste() {
        UUID profId = UUID.randomUUID();
        when(profesionalesClient.obtenerPorIdentidad(profId)).thenReturn(Optional.empty());

        CrearSolicitudRequest request = new CrearSolicitudRequest(
                UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle Falsa 123", -34.60, -58.38, LocalDateTime.now(), null, "Se corta la luz.");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.crear(request));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(ex.getReason().contains("no existe"));
    }

    @Test
    void rechazaSolicitudSiProfesionalNoEstaActivo() {
        UUID profId = UUID.randomUUID();
        when(profesionalesClient.obtenerPorIdentidad(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, UUID.randomUUID(), "CARGADO")));

        CrearSolicitudRequest request = new CrearSolicitudRequest(
                UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle Falsa 123", -34.60, -58.38, LocalDateTime.now(), null, "Se corta la luz.");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.crear(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("activado"));
    }

    @Test
    void permiteSolicitudSiProfesionalEstaActivoYDisponible() {
        UUID profId = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID espId = UUID.randomUUID();
        // Lunes a las 10:00
        LocalDateTime fecha = LocalDateTime.of(2026, 9, 21, 10, 0);

        when(profesionalesClient.obtenerPorIdentidad(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, UUID.randomUUID(), "ACTIVO")));
        when(profesionalesClient.obtenerDisponibilidad(profId))
                .thenReturn(List.of(new DisponibilidadProfesional("LUNES", LocalTime.of(8, 0), LocalTime.of(18, 0))));
        when(repository.existsByClienteIdAndEspecialidadIdAndEstadoIn(eq(clienteId), eq(espId), any()))
                .thenReturn(false);
        when(repository.save(any(Solicitud.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CrearSolicitudRequest request = new CrearSolicitudRequest(
                clienteId, profId, espId,
                "Calle Falsa 123", -34.60, -58.38, fecha, fecha.plusHours(4), "Se corta la luz y no vuelve.");

        var response = service.crear(request);
        assertNotNull(response);
        assertEquals(clienteId, response.clienteId());
        assertEquals(profId, response.profesionalId());
    }

    /** El resumen del problema es obligatorio: sin él el profesional no sabe qué resolver. */
    @Test
    void guardaElResumenDelProblemaYLoExponeEnLaRespuesta() {
        UUID profId = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID espId = UUID.randomUUID();
        LocalDateTime fecha = LocalDateTime.of(2026, 9, 21, 10, 0);

        when(profesionalesClient.obtenerPorIdentidad(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, UUID.randomUUID(), "ACTIVO")));
        when(repository.existsByClienteIdAndEspecialidadIdAndEstadoIn(eq(clienteId), eq(espId), any()))
                .thenReturn(false);
        when(repository.save(any(Solicitud.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.crear(new CrearSolicitudRequest(clienteId, profId, espId,
                "Calle Falsa 123", -34.60, -58.38, fecha, fecha.plusHours(4), "  Se corta la luz y no vuelve.  "));

        assertEquals("Se corta la luz y no vuelve.", response.descripcion());
        // El horario es un rango: se guardan inicio y fin.
        assertEquals(fecha, response.fechaHoraPropuesta());
        assertEquals(fecha.plusHours(4), response.fechaHoraFinPropuesta());
    }

    /** El fin del turno no puede ser anterior al inicio. */
    @Test
    void rechazaUnHorarioQueTerminaAntesDeEmpezar() {
        UUID profId = UUID.randomUUID();
        LocalDateTime fecha = LocalDateTime.now().plusDays(2).withSecond(0).withNano(0);

        when(profesionalesClient.obtenerPorIdentidad(profId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(profId, UUID.randomUUID(), "ACTIVO")));

        var request = new CrearSolicitudRequest(UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle Falsa 123", -34.60, -58.38, fecha, fecha.minusHours(1), "Se corta la luz.");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.crear(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("posterior al inicio"));
    }

    /** Sin resumen la validación falla: la capa web responde 400 antes de tocar la base. */
    @Test
    void elResumenEsObligatorioEnElContrato() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        UUID profId = UUID.randomUUID();
        // El turno también tiene que estar en el futuro: si no, falsea el @Future y la prueba
        // no estaría midiendo lo del resumen.
        LocalDateTime futuro = LocalDateTime.now().plusDays(2).withSecond(0).withNano(0);

        var sinResumen = new CrearSolicitudRequest(UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle Falsa 123", -34.60, -58.38, futuro, futuro.plusHours(4), "   ");
        assertFalse(validator.validate(sinResumen).isEmpty(),
                "una solicitud sin resumen del problema no debería validar");

        var conResumen = new CrearSolicitudRequest(UUID.randomUUID(), profId, UUID.randomUUID(),
                "Calle Falsa 123", -34.60, -58.38, futuro, futuro.plusHours(4), "Se corta la luz y no vuelve.");
        assertTrue(validator.validate(conResumen).isEmpty());
    }

    /**
     * El frontend arma la solicitud con el {@code usuarioId} del profesional: el servicio debe
     * resolver el perfil y persistir su id canónico, porque tanto la disponibilidad como el
     * listado de solicitudes trabajan con el id del padrón.
     */
    @Test
    void crearGuardaElIdDelPerfilCuandoElFrontendEnviaElUsuarioId() {
        UUID perfilId = UUID.randomUUID();
        UUID usuarioId = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID espId = UUID.randomUUID();
        LocalDateTime fecha = LocalDateTime.of(2026, 9, 21, 10, 0);

        when(profesionalesClient.obtenerPorIdentidad(usuarioId))
                .thenReturn(Optional.of(new ProfesionalIdentidad(perfilId, usuarioId, "ACTIVO")));
        when(profesionalesClient.obtenerDisponibilidad(perfilId))
                .thenReturn(List.of(new DisponibilidadProfesional("LUNES", LocalTime.of(8, 0), LocalTime.of(18, 0))));
        when(repository.existsByClienteIdAndEspecialidadIdAndEstadoIn(eq(clienteId), eq(espId), any()))
                .thenReturn(false);
        when(repository.save(any(Solicitud.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.crear(new CrearSolicitudRequest(clienteId, usuarioId, espId,
                "Calle Falsa 123", -34.60, -58.38, fecha, fecha.plusHours(4), "Se corta la luz y no vuelve."));

        assertEquals(perfilId, response.profesionalId());
        verify(profesionalesClient).obtenerDisponibilidad(perfilId);
    }

    @Test
    void completarReconoceAlClienteGuardadoConSuKeycloakId() {
        UUID id = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID keycloakId = UUID.randomUUID();
        Solicitud solicitud = solicitud(keycloakId, UUID.randomUUID());
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));

        var response = service.completar(id, new CambiarEstadoRequest(clienteId, "", keycloakId));

        assertEquals(EstadoSolicitud.COMPLETADA, response.estado());
    }

    @Test
    void noPermiteCompletarLaSolicitudDeOtroCliente() {
        UUID id = UUID.randomUUID();
        Solicitud solicitud = solicitud(UUID.randomUUID(), UUID.randomUUID());
        solicitud.cambiarEstado(EstadoSolicitud.ACEPTADA);
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));

        var ex = assertThrows(ResponseStatusException.class, () -> service.completar(id,
                new CambiarEstadoRequest(UUID.randomUUID(), "")));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals(EstadoSolicitud.ACEPTADA, solicitud.getEstado());
    }

    @Test
    void cancelarReconoceAlClienteGuardadoConSuKeycloakId() {
        UUID id = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID keycloakId = UUID.randomUUID();
        Solicitud solicitud = solicitud(keycloakId, UUID.randomUUID());
        when(repository.findById(id)).thenReturn(Optional.of(solicitud));

        var response = service.cancelar(id, new CambiarEstadoRequest(clienteId, "Ya no lo necesito", keycloakId));

        assertEquals(EstadoSolicitud.CANCELADA, response.estado());
        assertEquals("Ya no lo necesito", solicitud.getMotivoCancelacion());
    }
}

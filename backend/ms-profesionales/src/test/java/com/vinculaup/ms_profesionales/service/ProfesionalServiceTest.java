package com.vinculaup.ms_profesionales.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vinculaup.ms_profesionales.dto.ActivarProfesionalRequest;
import com.vinculaup.ms_profesionales.dto.ProfesionalResponse;
import com.vinculaup.ms_profesionales.entity.EstadoProfesional;
import com.vinculaup.ms_profesionales.entity.Profesional;
import com.vinculaup.ms_profesionales.repository.DisponibilidadRepository;
import com.vinculaup.ms_profesionales.repository.EspecialidadRepository;
import com.vinculaup.ms_profesionales.repository.ProfesionalRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ProfesionalServiceTest {

    private ProfesionalRepository profesionalRepository;
    private EspecialidadRepository especialidadRepository;
    private DisponibilidadRepository disponibilidadRepository;
    private ProfesionalService service;

    @BeforeEach
    void setUp() {
        profesionalRepository = mock(ProfesionalRepository.class);
        especialidadRepository = mock(EspecialidadRepository.class);
        disponibilidadRepository = mock(DisponibilidadRepository.class);
        service = new ProfesionalService(profesionalRepository, especialidadRepository, disponibilidadRepository);
    }

    @Test
    void devuelvePerfilExistenteSiYaEstaActivo() {
        UUID usuarioId = UUID.randomUUID();
        Profesional profesional = new Profesional(usuarioId, "PRO-TEST01", EstadoProfesional.ACTIVO);

        when(profesionalRepository.findByUsuarioId(usuarioId)).thenReturn(Optional.of(profesional));

        ActivarProfesionalRequest request = new ActivarProfesionalRequest(
                usuarioId, null, "http://foto.jpg", -34.60, -58.38, 10.0, List.of());

        ProfesionalResponse response = service.activarPorUsuario(request);

        assertEquals(EstadoProfesional.ACTIVO, response.estado());
        assertEquals(usuarioId, response.usuarioId());
        verify(profesionalRepository, never()).save(any());
    }

    @Test
    void lanzaConflictoSiEstaSuspendido() {
        UUID usuarioId = UUID.randomUUID();
        Profesional profesional = new Profesional(usuarioId, "PRO-TEST02", EstadoProfesional.SUSPENDIDO);

        when(profesionalRepository.findByUsuarioId(usuarioId)).thenReturn(Optional.of(profesional));

        ActivarProfesionalRequest request = new ActivarProfesionalRequest(
                usuarioId, null, "http://foto.jpg", -34.60, -58.38, 10.0, List.of());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.activarPorUsuario(request));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("suspendido"));
    }

    @Test
    void reactivarVuelveAPendienteSiNuncaSeActivo() {
        // Regla: el admin no activa perfiles. Si se banea a un profesional que
        // todavía no pasó por su alta, levantar el baneo debe devolverlo a
        // CARGADO (pendiente de activación), nunca a ACTIVO.
        Profesional profesional = new Profesional(UUID.randomUUID(), "PRO-TEST03", EstadoProfesional.CARGADO);
        profesional.suspender();

        profesional.reactivar();

        assertEquals(EstadoProfesional.CARGADO, profesional.getEstado());
        assertNull(profesional.getFechaActivacion());
    }

    @Test
    void reactivarVuelveAActivoSiYaCompletoSuAlta() {
        Profesional profesional = new Profesional(UUID.randomUUID(), "PRO-TEST04", EstadoProfesional.CARGADO);
        profesional.activar("http://foto.jpg", -34.60, -58.38, 10.0);
        profesional.suspender();

        profesional.reactivar();

        assertEquals(EstadoProfesional.ACTIVO, profesional.getEstado());
    }
}

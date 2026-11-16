package com.vinculaup.ms_profesionales.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vinculaup.ms_profesionales.dto.DisponibilidadRequest;
import com.vinculaup.ms_profesionales.entity.DiaSemana;
import com.vinculaup.ms_profesionales.entity.Disponibilidad;
import com.vinculaup.ms_profesionales.repository.DisponibilidadRepository;
import com.vinculaup.ms_profesionales.repository.ProfesionalRepository;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class DisponibilidadServiceTest {

    private final DisponibilidadRepository disponibilidadRepository =
            org.mockito.Mockito.mock(DisponibilidadRepository.class);
    private final ProfesionalRepository profesionalRepository =
            org.mockito.Mockito.mock(ProfesionalRepository.class);
    private final DisponibilidadService service =
            new DisponibilidadService(disponibilidadRepository, profesionalRepository);
    private final UUID profesionalId = UUID.randomUUID();

    @BeforeEach
    void profesionalExistente() {
        when(profesionalRepository.existsById(profesionalId)).thenReturn(true);
    }

    @Test
    void reemplazaYDevuelveLasFranjasValidas() {
        DisponibilidadRequest request = new DisponibilidadRequest(
                DiaSemana.LUNES, LocalTime.of(9, 0), LocalTime.of(12, 0));
        when(disponibilidadRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var responses = service.reemplazar(profesionalId, List.of(request));

        assertEquals(1, responses.size());
        assertEquals(profesionalId, responses.get(0).profesionalId());
        assertEquals(DiaSemana.LUNES, responses.get(0).diaSemana());
        assertEquals(LocalTime.of(9, 0), responses.get(0).horaInicio());
        assertEquals(LocalTime.of(12, 0), responses.get(0).horaFin());
        verify(disponibilidadRepository).deleteByProfesionalId(profesionalId);
    }

    @Test
    void noBorraLasFranjasExistentesSiElRangoEsInvalido() {
        DisponibilidadRequest request = new DisponibilidadRequest(
                DiaSemana.LUNES, LocalTime.of(12, 0), LocalTime.of(9, 0));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.reemplazar(profesionalId, List.of(request)));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(disponibilidadRepository, never()).deleteByProfesionalId(any());
        verify(disponibilidadRepository, never()).saveAll(any());
    }

    @Test
    void rechazaUnRangoSinDuracion() {
        DisponibilidadRequest request = new DisponibilidadRequest(
                DiaSemana.LUNES, LocalTime.of(9, 0), LocalTime.of(9, 0));

        assertThrows(ResponseStatusException.class,
                () -> service.reemplazar(profesionalId, List.of(request)));
        verify(disponibilidadRepository, never()).deleteByProfesionalId(profesionalId);
    }
}

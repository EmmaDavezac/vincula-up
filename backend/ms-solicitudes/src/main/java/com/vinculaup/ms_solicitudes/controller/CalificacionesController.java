package com.vinculaup.ms_solicitudes.controller;

import com.vinculaup.ms_solicitudes.dto.ReputacionProfesionalResponse;
import com.vinculaup.ms_solicitudes.dto.ResumenCalificacionResponse;
import com.vinculaup.ms_solicitudes.service.CalificacionService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reputación de los profesionales. Va en su propio controller (y no dentro de
 * {@code /solicitudes/{id}/calificacion}) porque el listado es de todos los
 * profesionales, no de una solicitud: es lo que alimenta las estrellas del
 * directorio y del selector de profesional.
 */
@RestController
@RequestMapping("/calificaciones")
public class CalificacionesController {

    private final CalificacionService service;

    public CalificacionesController(CalificacionService service) {
        this.service = service;
    }

    /** Un resumen por profesional que ya recibió calificaciones. */
    @GetMapping
    public List<ResumenCalificacionResponse> listar() {
        return service.resumenPorProfesional();
    }

    /**
     * Reputación de un profesional con el detalle de las reseñas. El BFF lo llama
     * sólo con el id del perfil del profesional autenticado, así que no permite
     * consultar la reputación de otro.
     */
    @GetMapping("/profesional/{profesionalId}")
    public ReputacionProfesionalResponse deProfesional(@PathVariable UUID profesionalId) {
        return service.reputacionDe(profesionalId);
    }
}

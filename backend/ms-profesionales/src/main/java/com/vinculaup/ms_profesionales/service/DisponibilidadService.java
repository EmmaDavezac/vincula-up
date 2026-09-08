package com.vinculaup.ms_profesionales.service;

import com.vinculaup.ms_profesionales.dto.DisponibilidadRequest;
import com.vinculaup.ms_profesionales.dto.DisponibilidadResponse;
import com.vinculaup.ms_profesionales.entity.Disponibilidad;
import com.vinculaup.ms_profesionales.repository.DisponibilidadRepository;
import com.vinculaup.ms_profesionales.repository.ProfesionalRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class DisponibilidadService {

    private final DisponibilidadRepository disponibilidadRepository;
    private final ProfesionalRepository profesionalRepository;

    public DisponibilidadService(DisponibilidadRepository disponibilidadRepository, ProfesionalRepository profesionalRepository) {
        this.disponibilidadRepository = disponibilidadRepository;
        this.profesionalRepository = profesionalRepository;
    }

    public List<DisponibilidadResponse> reemplazar(UUID profesionalId, List<DisponibilidadRequest> requests) {
        ensureProfessionalExists(profesionalId);
        requests.forEach(this::validateRange);
        disponibilidadRepository.deleteByProfesionalId(profesionalId);
        return disponibilidadRepository.saveAll(requests.stream()
                        .map(request -> new Disponibilidad(profesionalId, request.diaSemana(), request.horaInicio(), request.horaFin()))
                        .toList())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DisponibilidadResponse> listar(UUID profesionalId) {
        ensureProfessionalExists(profesionalId);
        return disponibilidadRepository.findByProfesionalId(profesionalId).stream().map(this::toResponse).toList();
    }

    private void ensureProfessionalExists(UUID profesionalId) {
        if (!profesionalRepository.existsById(profesionalId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado");
        }
    }

    private void validateRange(DisponibilidadRequest request) {
        if (!request.horaInicio().isBefore(request.horaFin())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La hora de inicio debe ser anterior a la hora de fin");
        }
    }

    private DisponibilidadResponse toResponse(Disponibilidad disponibilidad) {
        return new DisponibilidadResponse(
                disponibilidad.getId(),
                disponibilidad.getProfesionalId(),
                disponibilidad.getDiaSemana(),
                disponibilidad.getHoraInicio(),
                disponibilidad.getHoraFin());
    }
}

package com.vinculaup.ms_profesionales.repository;

import com.vinculaup.ms_profesionales.entity.EstadoProfesional;
import com.vinculaup.ms_profesionales.entity.Profesional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesionalRepository extends JpaRepository<Profesional, UUID> {
    Optional<Profesional> findByUsuarioId(UUID usuarioId);
    boolean existsByLegajoIgnoreCase(String legajo);
    List<Profesional> findByEstado(EstadoProfesional estado);
}

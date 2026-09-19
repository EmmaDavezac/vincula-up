package com.vinculaup.ms_profesionales.repository;

import com.vinculaup.ms_profesionales.entity.EstadoProfesional;
import com.vinculaup.ms_profesionales.entity.Profesional;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesionalRepository extends JpaRepository<Profesional, UUID> {
    Optional<Profesional> findByUsuarioId(UUID usuarioId);
    boolean existsByUsuarioId(UUID usuarioId);
    List<Profesional> findByUsuarioIdIn(Collection<UUID> usuarioIds);
    List<Profesional> findByUsuarioIdInOrIdIn(Collection<UUID> usuarioIds, Collection<UUID> ids);
    boolean existsByLegajoIgnoreCase(String legajo);
    List<Profesional> findByEstado(EstadoProfesional estado);
}

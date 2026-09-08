package com.vinculaup.ms_solicitudes.repository;

import com.vinculaup.ms_solicitudes.entity.Calificacion;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalificacionRepository extends JpaRepository<Calificacion, UUID> {
    Optional<Calificacion> findBySolicitudId(UUID solicitudId);
}

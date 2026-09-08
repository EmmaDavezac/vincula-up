package com.vinculaup.ms_profesionales.repository;

import com.vinculaup.ms_profesionales.entity.Disponibilidad;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisponibilidadRepository extends JpaRepository<Disponibilidad, UUID> {
    List<Disponibilidad> findByProfesionalId(UUID profesionalId);
    void deleteByProfesionalId(UUID profesionalId);
}

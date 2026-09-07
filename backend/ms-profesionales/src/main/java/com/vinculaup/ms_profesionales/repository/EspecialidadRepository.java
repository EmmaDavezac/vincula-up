package com.vinculaup.ms_profesionales.repository;

import com.vinculaup.ms_profesionales.entity.Especialidad;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EspecialidadRepository extends JpaRepository<Especialidad, UUID> {
}

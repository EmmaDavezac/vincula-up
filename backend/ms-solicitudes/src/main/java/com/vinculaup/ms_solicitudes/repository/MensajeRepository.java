package com.vinculaup.ms_solicitudes.repository;

import com.vinculaup.ms_solicitudes.entity.Mensaje;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MensajeRepository extends JpaRepository<Mensaje, UUID> {
    List<Mensaje> findBySolicitudIdOrderByFechaEnvioAsc(UUID solicitudId);
}

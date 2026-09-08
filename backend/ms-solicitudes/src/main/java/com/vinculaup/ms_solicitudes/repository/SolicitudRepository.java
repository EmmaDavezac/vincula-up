package com.vinculaup.ms_solicitudes.repository;

import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitudRepository extends JpaRepository<Solicitud, UUID> {
    boolean existsByClienteIdAndEspecialidadIdAndEstadoIn(UUID clienteId, UUID especialidadId, List<EstadoSolicitud> estados);
    List<Solicitud> findByClienteIdOrProfesionalId(UUID clienteId, UUID profesionalId);
}

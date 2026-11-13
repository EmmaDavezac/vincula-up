package com.vinculaup.ms_solicitudes.repository;

import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import java.util.Collection;
import java.util.List;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitudRepository extends JpaRepository<Solicitud, UUID> {
    boolean existsByClienteIdAndEspecialidadIdAndEstadoIn(UUID clienteId, UUID especialidadId, List<EstadoSolicitud> estados);
    boolean existsActiveByClienteIdAndEspecialidadId(UUID clienteId, UUID especialidadId);
    List<Solicitud> findByClienteIdOrProfesionalId(UUID clienteId, UUID profesionalId);

    /**
     * Solicitudes donde el usuario participa como cliente o como profesional.
     * <p>
     * Se aceptan varias identidades porque el padron profesional puede haberse creado con el
     * {@code keycloakId} y luego reconciliarse con el id de {@code ms-usuarios}: las solicitudes
     * viejas y las nuevas pueden apuntar a identificadores distintos del mismo profesional.
     */
    List<Solicitud> findByClienteIdInOrProfesionalIdIn(Collection<UUID> clienteIds, Collection<UUID> profesionalIds);
    List<Solicitud> findByProfesionalIdAndEstadoIn(UUID profesionalId, List<EstadoSolicitud> estados);

    List<Solicitud> findByProfesionalIdIn(Collection<UUID> profesionalIds);
    List<Solicitud> findByClienteIdIn(Collection<UUID> clienteIds);

    /** Todas las solicitudes de la más reciente a la más antigua (panel de administración). */
    List<Solicitud> findAllByOrderByFechaCreacionDesc();

    /** Solicitudes pendientes que superaron su fecha de expiración. */
    @Query("SELECT s FROM Solicitud s WHERE s.estado = com.vinculaup.ms_solicitudes.entity.EstadoSolicitud.PENDIENTE AND s.esVencible = true AND s.fechaExpiracion IS NOT NULL AND s.fechaExpiracion < :ahora")
    List<Solicitud> findPendientesExpiradas(@Param("ahora") LocalDateTime ahora);
}

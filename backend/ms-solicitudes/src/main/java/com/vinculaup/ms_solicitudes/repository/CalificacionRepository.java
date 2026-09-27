package com.vinculaup.ms_solicitudes.repository;

import com.vinculaup.ms_solicitudes.entity.Calificacion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CalificacionRepository extends JpaRepository<Calificacion, UUID> {
    Optional<Calificacion> findBySolicitudId(UUID solicitudId);

    /**
     * Promedio y cantidad de calificaciones por profesional. La calificación no
     * guarda el profesional (sólo la solicitud), así que se agrupa cruzando con
     * la solicitud: es lo que permite mostrar la reputación en el directorio sin
     * tener que recalcularla en cada tarjeta.
     */
    @Query("select s.profesionalId, avg(c.puntaje), count(c) "
            + "from Calificacion c, Solicitud s "
            + "where s.id = c.solicitudId "
            + "group by s.profesionalId")
    List<Object[]> resumenPorProfesional();

    /**
     * Reseñas recibidas por un profesional, de la más reciente a la más vieja.
     * Se cruza con la solicitud para traer también el cliente que la envió, así el
     * BFF puede mostrar su nombre sin que ms-solicitudes conozca ms-usuarios.
     */
    @Query("select c.id, c.solicitudId, c.puntaje, c.comentario, c.fechaCalificacion, s.clienteId "
            + "from Calificacion c, Solicitud s "
            + "where s.id = c.solicitudId and s.profesionalId = ?1 "
            + "order by c.fechaCalificacion desc")
    List<Object[]> resenasDeProfesional(UUID profesionalId);
}

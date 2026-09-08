package com.vinculaup.ms_solicitudes.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "calificaciones")
public class Calificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID solicitudId;

    @Column(nullable = false)
    private Integer puntaje;

    @Column(length = 1000)
    private String comentario;

    @Column(nullable = false)
    private LocalDateTime fechaCalificacion;

    protected Calificacion() {
    }

    public Calificacion(UUID solicitudId, Integer puntaje, String comentario) {
        this.solicitudId = solicitudId;
        this.puntaje = puntaje;
        this.comentario = comentario;
        this.fechaCalificacion = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getSolicitudId() { return solicitudId; }
    public Integer getPuntaje() { return puntaje; }
    public String getComentario() { return comentario; }
    public LocalDateTime getFechaCalificacion() { return fechaCalificacion; }
}

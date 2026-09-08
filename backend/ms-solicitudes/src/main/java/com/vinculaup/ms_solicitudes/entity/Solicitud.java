package com.vinculaup.ms_solicitudes.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "solicitudes")
public class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID clienteId;

    @Column(nullable = false)
    private UUID profesionalId;

    @Column(nullable = false)
    private UUID especialidadId;

    @Column(nullable = false, length = 500)
    private String direccionServicio;

    @Column(nullable = false)
    private LocalDateTime fechaHoraPropuesta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoSolicitud estado;

    private String motivoCancelacion;

    @Column(nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(nullable = false)
    private LocalDateTime fechaCambioEstado;

    protected Solicitud() {
    }

    public Solicitud(UUID clienteId, UUID profesionalId, UUID especialidadId, String direccionServicio,
            LocalDateTime fechaHoraPropuesta) {
        this.clienteId = clienteId;
        this.profesionalId = profesionalId;
        this.especialidadId = especialidadId;
        this.direccionServicio = direccionServicio;
        this.fechaHoraPropuesta = fechaHoraPropuesta;
        this.estado = EstadoSolicitud.PENDIENTE;
        this.fechaCreacion = LocalDateTime.now();
        this.fechaCambioEstado = this.fechaCreacion;
    }

    public UUID getId() { return id; }
    public UUID getClienteId() { return clienteId; }
    public UUID getProfesionalId() { return profesionalId; }
    public UUID getEspecialidadId() { return especialidadId; }
    public String getDireccionServicio() { return direccionServicio; }
    public LocalDateTime getFechaHoraPropuesta() { return fechaHoraPropuesta; }
    public EstadoSolicitud getEstado() { return estado; }
    public String getMotivoCancelacion() { return motivoCancelacion; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaCambioEstado() { return fechaCambioEstado; }

    public void cambiarEstado(EstadoSolicitud nuevoEstado) {
        this.estado = nuevoEstado;
        this.fechaCambioEstado = LocalDateTime.now();
    }

    public void rechazar(String motivo) {
        this.motivoCancelacion = motivo;
        cambiarEstado(EstadoSolicitud.RECHAZADA);
    }
}

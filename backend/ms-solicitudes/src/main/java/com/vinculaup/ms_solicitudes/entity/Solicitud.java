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

    /**
     * Resumen del problema que escribe el cliente al crear la solicitud. Es obligatorio:
     * es lo primero que lee el profesional para saber qué tiene que resolver.
     */
    @Column(length = 1000)
    private String descripcion;

    @Column(nullable = true)
    private Double latitud;

    @Column(nullable = true)
    private Double longitud;

    @Column(nullable = false)
    private LocalDateTime fechaHoraPropuesta;

    /**
     * Fin del turno. El horario de una solicitud es un rango (por ejemplo
     * 08:00 a 12:00): la fecha de inicio es la que se usa para validar la
     * disponibilidad del profesional, y este fin es el que se muestra.
     */
    @Column
    private LocalDateTime fechaHoraFinPropuesta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoSolicitud estado;

    private String motivoCancelacion;

    /**
     * Identificador de quien canceló (el {@code clienteId} o el {@code profesionalId}
     * de la solicitud). Antes no se guardaba y las dos partes veían el mismo texto
     * genérico; las cancelaciones anteriores a este campo quedan en {@code null}.
     */
    private UUID canceladaPor;

    @Column(nullable = false)
    private LocalDateTime fechaCreacion;

    @Column(nullable = false)
    private LocalDateTime fechaCambioEstado;

    protected Solicitud() {
    }

    public Solicitud(UUID clienteId, UUID profesionalId, UUID especialidadId, String direccionServicio,
            Double latitud, Double longitud, LocalDateTime fechaHoraPropuesta, String descripcion,
            LocalDateTime fechaHoraFinPropuesta) {
        this.clienteId = clienteId;
        this.profesionalId = profesionalId;
        this.especialidadId = especialidadId;
        this.direccionServicio = direccionServicio;
        this.latitud = latitud;
        this.longitud = longitud;
        this.fechaHoraPropuesta = fechaHoraPropuesta;
        this.descripcion = descripcion;
        this.fechaHoraFinPropuesta = fechaHoraFinPropuesta;
        this.estado = EstadoSolicitud.PENDIENTE;
        this.fechaCreacion = LocalDateTime.now();
        this.fechaCambioEstado = this.fechaCreacion;
    }

    public UUID getId() { return id; }
    public UUID getClienteId() { return clienteId; }
    public UUID getProfesionalId() { return profesionalId; }
    public UUID getEspecialidadId() { return especialidadId; }
    public String getDireccionServicio() { return direccionServicio; }
    public String getDescripcion() { return descripcion; }
    public Double getLatitud() { return latitud; }
    public Double getLongitud() { return longitud; }
    public LocalDateTime getFechaHoraPropuesta() { return fechaHoraPropuesta; }
    public LocalDateTime getFechaHoraFinPropuesta() { return fechaHoraFinPropuesta; }
    public EstadoSolicitud getEstado() { return estado; }
    public String getMotivoCancelacion() { return motivoCancelacion; }
    public UUID getCanceladaPor() { return canceladaPor; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaCambioEstado() { return fechaCambioEstado; }

    public void cambiarEstado(EstadoSolicitud nuevoEstado) {
        this.estado = nuevoEstado;
        this.fechaCambioEstado = LocalDateTime.now();
    }

    public void cambiarUbicacion(String direccionServicio, Double latitud, Double longitud) {
        this.direccionServicio = direccionServicio;
        this.latitud = latitud;
        this.longitud = longitud;
    }

    public void rechazar(String motivo) {
        this.motivoCancelacion = motivo;
        cambiarEstado(EstadoSolicitud.RECHAZADA);
    }

    public void cancelar(String motivo, UUID actorId) {
        this.motivoCancelacion = motivo;
        this.canceladaPor = actorId;
        cambiarEstado(EstadoSolicitud.CANCELADA);
    }
}


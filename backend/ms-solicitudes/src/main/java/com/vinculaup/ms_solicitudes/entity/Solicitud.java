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

    /**
     * Cifrador de coordenadas. Las entidades no son beans de Spring, así que el
     * cifrado se resuelve con un holder estático que el {@code CifradorUbicaciones}
     * registra al arrancar. Si nunca se registrara, se guarda en claro: la
     * aplicación sigue funcionando (útil en tests), pero el cifrado no aplica.
     */
    private static volatile com.vinculaup.ms_solicitudes.config.CifradorUbicaciones CIFRADOR;

    public static void registrarCifrador(com.vinculaup.ms_solicitudes.config.CifradorUbicaciones cifrador) {
        CIFRADOR = cifrador;
    }

    private static com.vinculaup.ms_solicitudes.config.CifradorUbicaciones cifrador() {
        return CIFRADOR;
    }

    @Column(nullable = false)
    private UUID clienteId;

    @Column(nullable = false)
    private UUID profesionalId;

    @Column(nullable = false)
    private UUID especialidadId;

    @Column(nullable = false, length = 500)
    private String direccionServicio;

    /**
     * Zona aproximada (barrio y localidad) que se le muestra al profesional
     * mientras la solicitud está pendiente: alcanza para saber si le queda lejos
     * o si la zona le resulta insegura, sin revelar calle ni altura.
     * <p>
     * No va cifrada a propósito: es un barrio, no un domicilio, y tiene que ser
     * legible para el filtro por rol del BFF y para los tests.
     */
    @Column(length = 255)
    private String zonaAproximada;

    /**
     * Resumen del problema que escribe el cliente al crear la solicitud. Es obligatorio:
     * es lo primero que lee el profesional para saber qué tiene que resolver.
     */
    @Column(length = 1000)
    private String descripcion;

    /**
     * Coordenadas del servicio, cifradas en reposo. Ver
     * {@code CifradorUbicaciones}: la API las devuelve descifradas, la base
     * no las guarda en claro.
     */
    @Column(name = "latitud", length = 512)
    private String latitudCifrada;

    @Column(name = "longitud", length = 512)
    private String longitudCifrada;

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

    /** Constructor sin zona: la solicitud queda sin zona aproximada (no se usó). */
    public Solicitud(UUID clienteId, UUID profesionalId, UUID especialidadId, String direccionServicio,
            Double latitud, Double longitud, LocalDateTime fechaHoraPropuesta, String descripcion,
            LocalDateTime fechaHoraFinPropuesta) {
        this(clienteId, profesionalId, especialidadId, direccionServicio, null,
                latitud, longitud, fechaHoraPropuesta, descripcion, fechaHoraFinPropuesta);
    }

    public Solicitud(UUID clienteId, UUID profesionalId, UUID especialidadId, String direccionServicio,
            String zonaAproximada, Double latitud, Double longitud, LocalDateTime fechaHoraPropuesta,
            String descripcion, LocalDateTime fechaHoraFinPropuesta) {
        this.clienteId = clienteId;
        this.profesionalId = profesionalId;
        this.especialidadId = especialidadId;
        this.direccionServicio = direccionServicio;
        this.zonaAproximada = zonaAproximada;
        this.latitudCifrada = cifrar(latitud);
        this.longitudCifrada = cifrar(longitud);
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
    public String getZonaAproximada() { return zonaAproximada; }
    public String getDescripcion() { return descripcion; }
    /**
     * Devuelve la latitud descifrada. La API sigue exponiendo coordenadas
     * normales: el cifrado es solo en reposo.
     */
    public Double getLatitud() { return descifrar(latitudCifrada); }
    public Double getLongitud() { return descifrar(longitudCifrada); }

    /** Texto tal como queda guardado: sirve para verificar el cifrado. */
    public String getLatitudCifrada() { return latitudCifrada; }
    public String getLongitudCifrada() { return longitudCifrada; }

    private static String cifrar(Double valor) {
        if (valor == null) {
            return null;
        }
        return CIFRADOR == null ? String.valueOf(valor) : CIFRADOR.cifrar(valor);
    }

    private static Double descifrar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        if (CIFRADOR == null) {
            try {
                return Double.valueOf(valor.trim());
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return CIFRADOR.descifrar(valor);
    }
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
        this.latitudCifrada = cifrar(latitud);
        this.longitudCifrada = cifrar(longitud);
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


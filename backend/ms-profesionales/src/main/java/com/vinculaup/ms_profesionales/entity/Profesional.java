package com.vinculaup.ms_profesionales.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "profesionales")
public class Profesional {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID usuarioId;

    @Column(nullable = false, unique = true)
    private String legajo;

    /**
     * Foto del perfil. Se guarda como data URL Base64, por lo que necesita TEXT
     * (el varchar por defecto truncaría/fallaría con imagenes reales).
     */
    @Column(columnDefinition = "text")
    private String fotoUrl;
    private Double zonaCoberturaLat;
    private Double zonaCoberturaLng;
    private Double radioKm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoProfesional estado;

    @Column(nullable = false)
    private OffsetDateTime fechaCarga;

    private OffsetDateTime fechaActivacion;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "profesional_especialidad",
            joinColumns = @JoinColumn(name = "profesional_id"),
            inverseJoinColumns = @JoinColumn(name = "especialidad_id"))
    private Set<Especialidad> especialidades = new HashSet<>();

    protected Profesional() {
    }

    public Profesional(UUID usuarioId, String legajo, Set<Especialidad> especialidades) {
        this.usuarioId = usuarioId;
        this.legajo = legajo;
        this.especialidades = especialidades;
        this.estado = EstadoProfesional.CARGADO;
        this.fechaCarga = OffsetDateTime.now();
    }

    public Profesional(UUID usuarioId, String legajo, EstadoProfesional estado) {
        this.usuarioId = usuarioId;
        this.legajo = legajo;
        this.estado = estado;
        this.fechaCarga = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }
    public void setLegajo(String legajo) { this.legajo = legajo; }
    public String getLegajo() { return legajo; }
    public String getFotoUrl() { return fotoUrl; }
    public Double getZonaCoberturaLat() { return zonaCoberturaLat; }
    public Double getZonaCoberturaLng() { return zonaCoberturaLng; }
    public Double getRadioKm() { return radioKm; }
    public EstadoProfesional getEstado() { return estado; }
    public OffsetDateTime getFechaCarga() { return fechaCarga; }
    public OffsetDateTime getFechaActivacion() { return fechaActivacion; }
    public Set<Especialidad> getEspecialidades() { return especialidades; }
    public void setEspecialidades(Set<Especialidad> especialidades) {
        this.especialidades = especialidades == null ? new HashSet<>() : especialidades;
    }

    public void activar(String fotoUrl, double lat, double lng, double radioKm) {
        this.fotoUrl = fotoUrl;
        this.zonaCoberturaLat = lat;
        this.zonaCoberturaLng = lng;
        this.radioKm = radioKm;
        this.estado = EstadoProfesional.ACTIVO;
        this.fechaActivacion = OffsetDateTime.now();
    }

    public void suspender() {
        this.estado = EstadoProfesional.SUSPENDIDO;
    }

    public void reactivar() {
        // Levantar un baneo nunca "activa" el perfil: si el profesional todavía
        // no completó su alta, vuelve a quedar pendiente de activación.
        this.estado = fechaActivacion == null ? EstadoProfesional.CARGADO : EstadoProfesional.ACTIVO;
    }
}

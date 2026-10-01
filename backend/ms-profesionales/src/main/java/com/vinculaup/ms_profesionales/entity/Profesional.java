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

    /**
     * Cifrador de coordenadas. Las entidades no son beans de Spring, así que el
     * cifrado se resuelve con un holder estático que el {@code CifradorUbicaciones}
     * registra al arrancar. Si nunca se registrara, se guarda en claro: la
     * aplicación sigue funcionando (útil en tests), pero el cifrado no aplica.
     */
    private static volatile com.vinculaup.ms_profesionales.config.CifradorUbicaciones CIFRADOR;

    public static void registrarCifrador(com.vinculaup.ms_profesionales.config.CifradorUbicaciones cifrador) {
        CIFRADOR = cifrador;
    }

    private static com.vinculaup.ms_profesionales.config.CifradorUbicaciones cifrador() {
        return CIFRADOR;
    }

    @Column(nullable = false, unique = true)
    private UUID usuarioId;

    @Column(nullable = false, unique = true)
    private String legajo;

    /**
     * Clave del archivo de la foto del perfil, dentro del volumen de fotos
     * ({@code perfiles/<uuid>.jpg}). El archivo no vive en la base y la clave no
     * se expone: la foto se pide por {@code GET /api/usuarios/{id}/foto}, que
     * valida sesión y rol antes de devolver los bytes.
     */
    @Column(length = 512)
    private String fotoUrl;
    /** Zona de cobertura cifrada en reposo. Ver {@code CifradorUbicaciones}. */
    @Column(name = "zona_cobertura_lat", length = 512)
    private String zonaCoberturaLatCifrada;
    @Column(name = "zona_cobertura_lng", length = 512)
    private String zonaCoberturaLngCifrada;
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

    /**
     * Devuelve la latitud descifrada. Toda la aplicación lee por acá, así que la
     * API sigue exponiendo coordenadas normales: el cifrado es solo en reposo.
     */
    public Double getZonaCoberturaLat() {
        return cifrador() == null ? leerComoNumero(zonaCoberturaLatCifrada) : cifrador().descifrar(zonaCoberturaLatCifrada);
    }

    public Double getZonaCoberturaLng() {
        return cifrador() == null ? leerComoNumero(zonaCoberturaLngCifrada) : cifrador().descifrar(zonaCoberturaLngCifrada);
    }

    /** Texto tal como queda guardado: sirve para verificar el cifrado. */
    public String getZonaCoberturaLatCifrada() { return zonaCoberturaLatCifrada; }
    public String getZonaCoberturaLngCifrada() { return zonaCoberturaLngCifrada; }

    private Double leerComoNumero(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        try {
            return Double.valueOf(valor.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
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
        // Se cifra al escribir: lo que llega del request nunca toca la base en claro.
        this.zonaCoberturaLatCifrada = cifrador() == null ? String.valueOf(lat) : cifrador().cifrar(lat);
        this.zonaCoberturaLngCifrada = cifrador() == null ? String.valueOf(lng) : cifrador().cifrar(lng);
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

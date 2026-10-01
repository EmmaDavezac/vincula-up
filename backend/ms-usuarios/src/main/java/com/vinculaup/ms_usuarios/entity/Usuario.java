package com.vinculaup.ms_usuarios.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Identificador del usuario en Keycloak. Es {@code null} mientras la cuenta
     * está "invitada": el administrador precargó los datos del profesional y la
     * identidad se vincula automáticamente en el primer login (por email).
     */
    @Column(unique = true)
    private UUID keycloakId;
    private String nombre;
    private String apellido;
    @Column(nullable = false, unique = true)
    private String email;
    private String telefono;
    /**
     * Clave del archivo de la foto de perfil, dentro del volumen de fotos
     * ({@code perfiles/<uuid>.jpg}). El archivo vive afuera y la clave no se
     * expone: la foto se pide por {@code GET /api/usuarios/{id}/foto}, que valida
     * sesión y rol. Por eso alcanza con una columna corta.
     */
    @Column(length = 512)
    private String fotoUrl;

    @Enumerated(EnumType.STRING)
    private RolNegocio rolNegocio;

    /**
     * Estado administrativo. Se deja nullable a propósito: las filas creadas
     * antes de incorporar el baneo quedan en {@code null} y se interpretan como
     * {@code ACTIVO}, así la columna nueva no rompe bases ya existentes.
     */
    @Enumerated(EnumType.STRING)
    private EstadoUsuario estado;

    private OffsetDateTime fechaAlta;

    /**
     * Versión de los términos y condiciones que la persona aceptó, y cuándo.
     *
     * <p>Las dos columnas son nullable a propósito, igual que {@code estado}: las
     * cuentas que ya existían antes de que los términos fueran obligatorios
     * quedan con {@code null} y se leen como "no aceptó", así que la aplicación
     * se los pide en el primer ingreso.
     *
     * <p>Guardar la <b>versión</b> y no solo una fecha es lo que permite volver a
     * pedir la aceptación cuando el texto cambia: la comparación la hace el
     * frontend contra la versión que tiene publicada.
     */
    @Column(length = 32)
    private String terminosVersion;

    private OffsetDateTime terminosAceptadoEn;

    protected Usuario() {
    }

    public Usuario(UUID keycloakId, String nombre, String apellido, String email, String telefono, RolNegocio rolNegocio) {
        this(null, keycloakId, nombre, apellido, email, telefono, rolNegocio);
    }

    public Usuario(UUID id, UUID keycloakId, String nombre, String apellido, String email, String telefono, RolNegocio rolNegocio) {
        this.id = id;
        this.keycloakId = keycloakId;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.telefono = telefono;
        this.rolNegocio = rolNegocio;
        this.estado = EstadoUsuario.ACTIVO;
        this.fechaAlta = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getKeycloakId() { return keycloakId; }
    public void setKeycloakId(UUID keycloakId) { this.keycloakId = keycloakId; }
    public String getNombre() { return nombre; }
    public String getApellido() { return apellido; }
    public String getEmail() { return email; }
    public String getTelefono() { return telefono; }
    public String getFotoUrl() { return fotoUrl; }
    public RolNegocio getRolNegocio() { return rolNegocio; }
    public OffsetDateTime getFechaAlta() { return fechaAlta; }

    /** Las filas previas al baneo tienen {@code estado} nulo: se leen como ACTIVO. */
    public EstadoUsuario getEstado() { return estado == null ? EstadoUsuario.ACTIVO : estado; }
    public boolean isSuspendido() { return getEstado() == EstadoUsuario.SUSPENDIDO; }
    public boolean isInvitado() { return keycloakId == null; }

    public void setRolNegocio(RolNegocio rolNegocio) { this.rolNegocio = rolNegocio; }

    /** Completa los datos personales que falten con los claims de Keycloak. */
    public void completarDatosPersonales(String nombre, String apellido) {
        if ((this.nombre == null || this.nombre.isBlank()) && nombre != null && !nombre.isBlank()) {
            this.nombre = nombre.trim();
        }
        if ((this.apellido == null || this.apellido.isBlank()) && apellido != null && !apellido.isBlank()) {
            this.apellido = apellido.trim();
        }
    }

    /** Acepta los términos y condiciones de la versión dada, queda registrado cuándo. */
    public void aceptarTerminos(String version) {
        this.terminosVersion = version;
        this.terminosAceptadoEn = OffsetDateTime.now();
    }

    public String getTerminosVersion() {
        return terminosVersion;
    }

    /** {@code true} si aceptó alguna versión de los términos (la actual la compara el frontend). */
    public boolean haAceptadoTerminos() {
        return terminosAceptadoEn != null;
    }

    public OffsetDateTime getTerminosAceptadoEn() {
        return terminosAceptadoEn;
    }

    public void suspender() { this.estado = EstadoUsuario.SUSPENDIDO; }

    public void reactivar() { this.estado = EstadoUsuario.ACTIVO; }

    /**
     * Actualización parcial del perfil propio ("Mi cuenta") o desde el panel
     * admin. Solo se tocan los campos que llegan no nulos; los vacíos/en blanco
     * se ignoran para no pisar datos (salvo fotoUrl: null/vacío = quitar foto).
     * El email es la identidad que vincula Keycloak con el padrón y nunca se
     * cambia por acá.
     */
    public void update(String nombre, String apellido, String email, String telefono, String fotoUrl) {
        if (nombre != null && !nombre.isBlank()) {
            this.nombre = nombre.trim();
        }
        if (apellido != null && !apellido.isBlank()) {
            this.apellido = apellido.trim();
        }
        if (email != null && !email.isBlank()) {
            this.email = email;
        }
        if (telefono != null && !telefono.isBlank()) {
            this.telefono = telefono.trim();
        }
        if (fotoUrl != null) {
            this.fotoUrl = fotoUrl.isBlank() ? null : fotoUrl;
        }
    }
}

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

    @Column(nullable = false, unique = true)
    private UUID keycloakId;
    private String nombre;
    private String apellido;
    @Column(nullable = false, unique = true)
    private String email;
    private String telefono;
    private String fotoUrl;

    @Enumerated(EnumType.STRING)
    private RolNegocio rolNegocio;

    private OffsetDateTime fechaAlta;

    protected Usuario() {
    }

    public Usuario(UUID keycloakId, String nombre, String apellido, String email, String telefono, RolNegocio rolNegocio) {
        this.keycloakId = keycloakId;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.telefono = telefono;
        this.rolNegocio = rolNegocio;
        this.fechaAlta = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getKeycloakId() { return keycloakId; }
    public String getNombre() { return nombre; }
    public String getApellido() { return apellido; }
    public String getEmail() { return email; }
    public String getTelefono() { return telefono; }
    public String getFotoUrl() { return fotoUrl; }
    public RolNegocio getRolNegocio() { return rolNegocio; }
    public OffsetDateTime getFechaAlta() { return fechaAlta; }

    public void update(String nombre, String apellido, String email, String telefono, String fotoUrl) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.telefono = telefono;
        this.fotoUrl = fotoUrl;
    }
}

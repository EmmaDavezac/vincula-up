package com.vinculaup.ms_usuarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "suscripciones_push")
public class SuscripcionPush {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID usuarioId;

    @Column(nullable = false, unique = true, length = 2048)
    private String endpoint;

    @Column(nullable = false, length = 512)
    private String clavePublica;

    @Column(nullable = false, length = 256)
    private String secretoAutenticacion;

    @Column(nullable = false)
    private OffsetDateTime actualizadaEn;

    protected SuscripcionPush() {
    }

    public SuscripcionPush(UUID usuarioId, String endpoint, String clavePublica, String secretoAutenticacion) {
        this.usuarioId = usuarioId;
        this.endpoint = endpoint;
        this.clavePublica = clavePublica;
        this.secretoAutenticacion = secretoAutenticacion;
        this.actualizadaEn = OffsetDateTime.now();
    }

    public void actualizar(UUID usuarioId, String clavePublica, String secretoAutenticacion) {
        this.usuarioId = usuarioId;
        this.clavePublica = clavePublica;
        this.secretoAutenticacion = secretoAutenticacion;
        this.actualizadaEn = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getUsuarioId() { return usuarioId; }
    public String getEndpoint() { return endpoint; }
    public String getClavePublica() { return clavePublica; }
    public String getSecretoAutenticacion() { return secretoAutenticacion; }
    public OffsetDateTime getActualizadaEn() { return actualizadaEn; }
}
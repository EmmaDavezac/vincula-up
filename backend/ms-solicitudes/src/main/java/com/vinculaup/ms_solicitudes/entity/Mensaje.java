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
@Table(name = "mensajes")
public class Mensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID solicitudId;

    @Column(nullable = false)
    private UUID emisorId;

    @Column(nullable = false, length = 2000)
    private String texto;

    @Column(nullable = false)
    private LocalDateTime fechaEnvio;

    protected Mensaje() {
    }

    public Mensaje(UUID solicitudId, UUID emisorId, String texto) {
        this.solicitudId = solicitudId;
        this.emisorId = emisorId;
        this.texto = texto;
        this.fechaEnvio = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getSolicitudId() { return solicitudId; }
    public UUID getEmisorId() { return emisorId; }
    public String getTexto() { return texto; }
    public LocalDateTime getFechaEnvio() { return fechaEnvio; }
}

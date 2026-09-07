package com.vinculaup.ms_profesionales.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "especialidades")
public class Especialidad {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String nombre;

    protected Especialidad() {
    }

    public Especialidad(String nombre) {
        this.nombre = nombre;
    }

    public UUID getId() { return id; }
    public String getNombre() { return nombre; }
}

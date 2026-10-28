package com.vinculaup.ms_solicitudes.client;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "profesionales", url = "${profesionales.url}")
public interface ProfesionalesClient {

    @GetMapping("/profesionales/{id}/disponibilidad")
    List<DisponibilidadProfesional> obtenerDisponibilidad(@PathVariable UUID id);

    @GetMapping("/profesionales/por-usuario")
    List<ProfesionalIdentidad> obtenerIdentidades(@RequestParam Collection<UUID> usuarioIds);

    @GetMapping("/profesionales/{id}")
    Optional<ProfesionalIdentidad> obtenerPorId(@PathVariable UUID id);

    default java.util.Optional<ProfesionalIdentidad> obtenerPorIdentidad(UUID identidad) {
        if (identidad == null) {
            return java.util.Optional.empty();
        }
        return obtenerPorId(identidad);
    }
}

package com.vinculaup.bff_web.client;

import java.util.List;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import tools.jackson.databind.JsonNode;

@FeignClient(name = "profesionales", url = "${profesionales.url}")
public interface ProfesionalesClient {

    @GetMapping
    JsonNode listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Boolean todos);

    @PostMapping
    JsonNode crear(@RequestBody JsonNode body);

    @GetMapping("/{id}")
    JsonNode buscarPorId(@PathVariable UUID id);

    @GetMapping("/por-usuario")
    JsonNode listarPorUsuarioIds(@RequestParam(required = false) List<UUID> usuarioIds);

    @GetMapping("/mi-perfil")
    JsonNode miPerfil(
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) UUID keycloakId);

    @PostMapping("/vincular")
    JsonNode vincular(@RequestBody JsonNode body);

    @RequestMapping(value = "/activar", method = {RequestMethod.PATCH, RequestMethod.POST, RequestMethod.PUT})
    JsonNode activarPorUsuario(@RequestBody JsonNode body);

    @PatchMapping("/{id}/activar")
    JsonNode activar(@PathVariable UUID id, @RequestBody JsonNode body);

    @PatchMapping("/{id}/suspender")
    JsonNode suspender(@PathVariable UUID id);

    @PatchMapping("/{id}/reactivar")
    JsonNode reactivar(@PathVariable UUID id);

    @GetMapping("/especialidades")
    JsonNode listarEspecialidades();

    @PostMapping("/especialidades")
    JsonNode crearEspecialidad(@RequestBody JsonNode body);

    @PutMapping("/especialidades/{id}")
    JsonNode actualizarEspecialidad(@PathVariable UUID id, @RequestBody JsonNode body);

    @DeleteMapping("/especialidades/{id}")
    void eliminarEspecialidad(@PathVariable UUID id);

    @PutMapping("/profesionales/{id}")
    JsonNode actualizarProfesional(@PathVariable UUID id, @RequestBody JsonNode body);

    @GetMapping("/profesionales/{profesionalId}/disponibilidad")
    JsonNode listarDisponibilidad(@PathVariable UUID profesionalId);

    @PutMapping("/profesionales/{profesionalId}/disponibilidad")
    JsonNode reemplazarDisponibilidad(
            @PathVariable UUID profesionalId,
            @RequestBody List<JsonNode> requests);

    @PutMapping("/profesionales/{id}/disponibilidad")
    JsonNode actualizarDisponibilidad(@PathVariable UUID id, @RequestBody List<JsonNode> requests);
}
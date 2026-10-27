package com.vinculaup.bff_web.client;

import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import tools.jackson.databind.JsonNode;

@FeignClient(name = "usuarios", url = "${usuarios.url}")
public interface UsuariosClient {

    @GetMapping
    JsonNode listar(
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) String estado);

    @PostMapping
    JsonNode crear(@RequestBody JsonNode body);

    @GetMapping("/por-email")
    JsonNode buscarPorEmail(@RequestParam String email);

    @PatchMapping("/{id}/terminos")
    JsonNode aceptarTerminos(@PathVariable UUID id, @RequestBody JsonNode body);

    @GetMapping("/{id}")
    JsonNode buscarPorId(@PathVariable UUID id);

    @PatchMapping("/{id}/keycloak")
    JsonNode vincularKeycloak(@PathVariable UUID id, @RequestBody JsonNode body);

    @PatchMapping("/{id}/suspender")
    JsonNode suspender(@PathVariable UUID id);

    @PatchMapping("/{id}/reactivar")
    JsonNode reactivar(@PathVariable UUID id);

    @GetMapping("/por-keycloak")
    JsonNode buscarPorKeycloakId(
            @RequestParam UUID keycloakId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String apellido,
            @RequestParam(required = false) String rol);

    @DeleteMapping("/{id}")
    void eliminar(@PathVariable UUID id);

    @PatchMapping("/{id}")
    JsonNode actualizar(@PathVariable UUID id, @RequestBody JsonNode body);

    @PatchMapping("/{id}/suspender")
    JsonNode suspender(@PathVariable UUID id);

    @PatchMapping("/{id}/reactivar")
    JsonNode reactivar(@PathVariable UUID id);
}
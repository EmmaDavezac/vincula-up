package com.vinculaup.bff_web.client;

import java.util.List;
import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import tools.jackson.databind.JsonNode;

@FeignClient(name = "solicitudes", url = "${solicitudes.url}")
public interface SolicitudesClient {

    @GetMapping("/geocodificar")
    JsonNode geocodificar(
            @RequestParam(required = false, defaultValue = "") String direccion);

    @PostMapping
    JsonNode crear(@RequestBody JsonNode body);

    @GetMapping("/panel")
    JsonNode listarParaPanel();

    @GetMapping("/mias")
    JsonNode listarPropias(
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) List<UUID> aliasIds,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String rol);

    @PatchMapping("/{id}/aceptar")
    JsonNode aceptar(@PathVariable UUID id, @RequestBody JsonNode body);

    @PatchMapping("/{id}/rechazar")
    JsonNode rechazar(@PathVariable UUID id, @RequestBody JsonNode body);

    @PatchMapping("/{id}/completar")
    JsonNode completar(@PathVariable UUID id, @RequestBody JsonNode body);

    @PatchMapping("/{id}/cancelar")
    JsonNode cancelar(@PathVariable UUID id, @RequestBody JsonNode body);

    /* ── Mensajes ───────────────────────────────────────────────────────── */

    @GetMapping("/solicitudes/{solicitudId}/mensajes")
    JsonNode listarMensajes(
            @PathVariable UUID solicitudId,
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) UUID keycloakId);

    @PostMapping("/solicitudes/{solicitudId}/mensajes")
    JsonNode enviarMensaje(
            @PathVariable UUID solicitudId,
            @RequestBody JsonNode body);

    /* ── Calificaciones ─────────────────────────────────────────────────── */

    @PostMapping("/solicitudes/{solicitudId}/calificacion")
    JsonNode crearCalificacion(
            @PathVariable UUID solicitudId,
            @RequestBody JsonNode body);

    @GetMapping("/solicitudes/{solicitudId}/calificacion")
    JsonNode obtenerCalificacion(@PathVariable UUID solicitudId);

    /* ── Reputación ─────────────────────────────────────────────────────── */

    @GetMapping("/calificaciones")
    JsonNode listarResumenCalificaciones();

    @GetMapping("/calificaciones/profesional/{profesionalId}")
    JsonNode reputacionDe(@PathVariable UUID profesionalId);
}
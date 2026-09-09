package com.vinculaup.bff_web.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.vinculaup.bff_web.service.BackendGateway;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final BackendGateway gateway;

    public ApiController(BackendGateway gateway) {
        this.gateway = gateway;
    }

    @GetMapping("/profesionales")
    public JsonNode listarProfesionales(@RequestParam(required = false) String estado) {
        return gateway.listarProfesionales(estado);
    }

    @PostMapping("/profesionales")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearProfesional(@RequestBody JsonNode body) {
        return gateway.crearProfesional(body);
    }

    @PatchMapping("/profesionales/activar")
    public JsonNode activarProfesional(@RequestBody JsonNode body) {
        return gateway.activarProfesional(body);
    }

    @GetMapping("/especialidades")
    public JsonNode listarEspecialidades() {
        return gateway.listarEspecialidades();
    }

    @PatchMapping("/profesionales/{id}/suspender")
    public JsonNode suspenderProfesional(@PathVariable UUID id) {
        return gateway.suspenderProfesional(id);
    }

    @PostMapping("/solicitudes")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearSolicitud(@RequestBody JsonNode body) {
        return gateway.crearSolicitud(body);
    }

    @GetMapping("/usuarios/por-keycloak")
    public JsonNode buscarPorKeycloak(@RequestParam UUID keycloakId) {
        return gateway.buscarUsuarioPorKeycloakId(keycloakId);
    }

    @GetMapping("/solicitudes/mias")
    public JsonNode listarSolicitudes(@RequestParam UUID usuarioId) {
        return gateway.listarSolicitudes(usuarioId);
    }

    @PatchMapping("/solicitudes/{id}/aceptar")
    public JsonNode aceptar(@PathVariable UUID id, @RequestBody JsonNode body) {
        return gateway.aceptarSolicitud(id, body);
    }

    @PatchMapping("/solicitudes/{id}/rechazar")
    public JsonNode rechazar(@PathVariable UUID id, @RequestBody JsonNode body) {
        return gateway.rechazarSolicitud(id, body);
    }

    @PatchMapping("/solicitudes/{id}/completar")
    public JsonNode completar(@PathVariable UUID id, @RequestBody JsonNode body) {
        return gateway.completarSolicitud(id, body);
    }

    @GetMapping("/solicitudes/{id}/mensajes")
    public JsonNode listarMensajes(@PathVariable UUID id, @RequestParam UUID usuarioId) {
        return gateway.listarMensajes(id, usuarioId);
    }

    @PostMapping("/solicitudes/{id}/mensajes")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode enviarMensaje(@PathVariable UUID id, @RequestBody JsonNode body) {
        return gateway.enviarMensaje(id, body);
    }

    @PostMapping("/solicitudes/{id}/calificacion")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearCalificacion(@PathVariable UUID id, @RequestBody JsonNode body) {
        return gateway.crearCalificacion(id, body);
    }

    @GetMapping("/gps")
    public Map<String, Object> obtenerUbicacionGps(@RequestParam(required = false, defaultValue = "") String direccion) {
        String normalizedAddress = direccion == null || direccion.isBlank() ? "Vincula-UP" : direccion.trim();
        int hash = Math.abs(normalizedAddress.hashCode());
        double latitude = -34.6037 + ((hash % 1000) / 1000.0) * 0.02;
        double longitude = -58.3816 + ((hash % 1000) / 1000.0) * 0.02;

        Map<String, Object> response = new HashMap<>();
        response.put("address", normalizedAddress);
        response.put("latitude", latitude);
        response.put("longitude", longitude);
        response.put("source", "demo-gps");
        return response;
    }
}

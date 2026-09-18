package com.vinculaup.bff_web.controller;

import tools.jackson.databind.JsonNode;
import com.vinculaup.bff_web.service.BackendGateway;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
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

    private JsonNode authenticatedUser() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Iniciá sesión para continuar");
        }
        return gateway.buscarUsuarioPorKeycloakId(UUID.fromString(jwt.getSubject()),
                jwt.getClaimAsString("email"), jwt.getClaimAsString("given_name"),
                jwt.getClaimAsString("family_name"), authenticatedRole());
    }

    private String authenticatedRole() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            for (String role : List.of("ADMIN", "PROFESIONAL", "CLIENTE")) {
                if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role))) {
                    return role;
                }
            }
        }
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Rol no autorizado");
    }

    private UUID authenticatedSubject() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Iniciá sesión para continuar");
        }
        return UUID.fromString(jwt.getSubject());
    }

    private UUID userId(JsonNode user) {
        return UUID.fromString(user.get("id").asText());
    }

    private JsonNode professionalProfile(JsonNode user, boolean activeRequired) {
        if (!"PROFESIONAL".equals(authenticatedRole())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere un perfil profesional");
        }
        JsonNode profile = gateway.obtenerMiPerfil(userId(user), authenticatedSubject()).getBody();
        if (activeRequired && (profile == null || !"ACTIVO".equals(profile.path("estado").asText()))) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "El perfil profesional debe estar activo");
        }
        return profile;
    }

    private JsonNode identityBody(JsonNode body, JsonNode user, String field) {
        if (!(body instanceof tools.jackson.databind.node.ObjectNode object)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Se esperaba un objeto");
        }
        var result = object.deepCopy();
        for (String alias : List.of("usuarioId", "actorId", "clienteId", "emisorId", "keycloakId")) {
            result.remove(alias);
        }
        result.put(field, userId(user).toString());
        if ("usuarioId".equals(field)) result.put("keycloakId", authenticatedSubject().toString());
        return result;
    }

    @GetMapping("/profesionales")
    public JsonNode listarProfesionales(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Boolean todos) {
        return gateway.listarProfesionales(estado, todos);
    }

    @PostMapping("/profesionales")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearProfesional(@RequestBody JsonNode body) {
        return gateway.crearProfesional(body);
    }

    @RequestMapping(value = "/profesionales/activar", method = {RequestMethod.PATCH, RequestMethod.POST, RequestMethod.PUT})
    public JsonNode activarProfesional(@RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        professionalProfile(user, false);
        return gateway.activarProfesional(identityBody(body, user, "usuarioId"));
    }

    @GetMapping("/profesionales/mi-perfil")
    public ResponseEntity<JsonNode> miPerfil(
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) UUID keycloakId) {
        JsonNode profile = professionalProfile(authenticatedUser(), false);
        return profile == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(profile);
    }

    @PostMapping("/especialidades")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearEspecialidad(@RequestBody JsonNode body) { return gateway.crearEspecialidad(body); }

    @PutMapping("/especialidades/{id}")
    public JsonNode actualizarEspecialidad(@PathVariable UUID id, @RequestBody JsonNode body) { return gateway.actualizarEspecialidad(id, body); }

    @org.springframework.web.bind.annotation.DeleteMapping("/especialidades/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarEspecialidad(@PathVariable UUID id) { gateway.eliminarEspecialidad(id); }

    @PutMapping("/profesionales/{id}")
    public JsonNode actualizarProfesional(@PathVariable UUID id, @RequestBody JsonNode body) { return gateway.actualizarProfesional(id, body); }

    @org.springframework.web.bind.annotation.DeleteMapping("/profesionales/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarProfesional(@PathVariable UUID id) { gateway.eliminarProfesional(id); }

    @PostMapping("/usuarios")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearUsuario(@RequestBody JsonNode body) { return gateway.crearUsuario(body); }

    @PatchMapping("/usuarios/{id}")
    public JsonNode actualizarUsuario(@PathVariable UUID id, @RequestBody JsonNode body) { return gateway.actualizarUsuario(id, body); }

    @org.springframework.web.bind.annotation.DeleteMapping("/usuarios/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarUsuario(@PathVariable UUID id) { gateway.eliminarUsuario(id); }

    @GetMapping("/especialidades")
    public JsonNode listarEspecialidades() {
        return gateway.listarEspecialidades();
    }

    @PatchMapping("/profesionales/{id}/suspender")
    public JsonNode suspenderProfesional(@PathVariable UUID id) {
        return gateway.suspenderProfesional(id);
    }

    @PatchMapping("/profesionales/{id}/reactivar")
    public JsonNode reactivarProfesional(@PathVariable UUID id) {
        return gateway.reactivarProfesional(id);
    }

    @PutMapping("/profesionales/{id}/disponibilidad")
    public JsonNode actualizarDisponibilidad(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode profile = professionalProfile(authenticatedUser(), true);
        if (!id.toString().equals(profile.path("id").asText())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "El perfil no pertenece al usuario");
        }
        return gateway.actualizarDisponibilidad(id, body);
    }

    @GetMapping("/profesionales/{id}/disponibilidad")
    public JsonNode listarDisponibilidad(@PathVariable UUID id) {
        return gateway.listarDisponibilidad(id);
    }

    @GetMapping("/usuarios")
    public JsonNode listarUsuarios(@RequestParam(required = false) String rol) {
        return gateway.listarUsuarios(rol);
    }

    @GetMapping("/usuarios/{id}")
    public JsonNode buscarUsuarioPorId(@PathVariable UUID id) {
        return gateway.buscarUsuarioPorId(id);
    }

    @PostMapping("/solicitudes")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearSolicitud(@RequestBody JsonNode body) {
        return gateway.crearSolicitud(body);
    }

    @GetMapping("/usuarios/por-keycloak")
    public JsonNode buscarPorKeycloak(
            @RequestParam UUID keycloakId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String apellido,
            @RequestParam(required = false) String rol) {
        return authenticatedUser();
    }

    @PostMapping("/profesionales/vincular")
    public JsonNode vincularProfesional(@RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        professionalProfile(user, false);
        return gateway.vincularProfesional(identityBody(body, user, "usuarioId"));
    }

    @GetMapping("/solicitudes/mias")
    public JsonNode listarSolicitudes(
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) List<UUID> aliasIds,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String rol,
            @AuthenticationPrincipal Jwt jwt) {
        JsonNode user = authenticatedUser();
        String role = authenticatedRole();
        if ("PROFESIONAL".equals(role)) {
            professionalProfile(user, true);
        } else if (!"CLIENTE".equals(role)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Rol no autorizado");
        }
        return gateway.listarSolicitudes(userId(user), List.of(authenticatedSubject()),
                "PROFESIONAL".equals(role) ? "RECIBIDAS" : "ENVIADAS", role);
    }

    @PatchMapping("/solicitudes/{id}/aceptar")
    public JsonNode aceptar(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        professionalProfile(user, true);
        return gateway.aceptarSolicitud(id, identityBody(body, user, "actorId"));
    }

    @PatchMapping("/solicitudes/{id}/rechazar")
    public JsonNode rechazar(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        professionalProfile(user, true);
        return gateway.rechazarSolicitud(id, identityBody(body, user, "actorId"));
    }

    @PatchMapping("/solicitudes/{id}/completar")
    public JsonNode completar(@PathVariable UUID id, @RequestBody JsonNode body) {
        return gateway.completarSolicitud(id, body);
    }

    @PatchMapping("/solicitudes/{id}/cancelar")
    public JsonNode cancelar(@PathVariable UUID id, @RequestBody JsonNode body) {
        return gateway.cancelarSolicitud(id, body);
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

    @GetMapping("/solicitudes/{id}/calificacion")
    public JsonNode obtenerCalificacion(@PathVariable UUID id) {
        return gateway.obtenerCalificacion(id);
    }

    @GetMapping("/gps")
    public Map<String, Object> obtenerUbicacionGps(@RequestParam(required = false, defaultValue = "") String direccion) {
        String normalizedAddress = direccion == null || direccion.isBlank() ? "" : direccion.trim();
        Map<String, Object> response = new HashMap<>();
        response.put("address", normalizedAddress);
        response.put("resolved", false);
        response.put("latitude", null);
        response.put("longitude", null);
        response.put("latitud", null);
        response.put("longitud", null);

        if (normalizedAddress.isEmpty()) {
            response.put("source", "empty-query");
            response.put("error", "Dirección vacía. Escribí una calle, altura y ciudad.");
            return response;
        }

        Exception captured = null;
        Integer statusReceived = null;
        try {
            String encoded = java.net.URLEncoder.encode(normalizedAddress, java.nio.charset.StandardCharsets.UTF_8);
            String urlStr = "https://nominatim.openstreetmap.org/search?q=" + encoded + "&format=json&limit=1&accept-language=es&addressdetails=1";
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .connectTimeout(java.time.Duration.ofSeconds(6))
                    .build();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(urlStr))
                    .header("User-Agent", "VinculaUP-App/1.0 (contacto@vincula-up.local)")
                    .header("Referer", "https://vincula-up.local/")
                    .timeout(java.time.Duration.ofSeconds(8))
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> httpResponse = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            statusReceived = httpResponse.statusCode();
            if (statusReceived == 200) {
                tools.jackson.databind.ObjectMapper mapper = new tools.jackson.databind.ObjectMapper();
                tools.jackson.databind.JsonNode root = mapper.readTree(httpResponse.body());
                if (root.isArray() && !root.isEmpty()) {
                    tools.jackson.databind.JsonNode first = root.get(0);
                    double lat = first.path("lat").asDouble(Double.NaN);
                    double lon = first.path("lon").asDouble(Double.NaN);
                    if (!Double.isNaN(lat) && !Double.isNaN(lon)) {
                        String displayName = first.path("display_name").asText(normalizedAddress);
                        response.put("address", displayName);
                        response.put("latitude", lat);
                        response.put("longitude", lon);
                        response.put("latitud", lat);
                        response.put("longitud", lon);
                        response.put("source", "nominatim-osm");
                        response.put("resolved", true);
                        response.remove("error");
                        return response;
                    }
                }
                response.put("source", "nominatim-empty");
                response.put("error", "Nominatim no encontró resultados para esa dirección. Intentá agregar altura o localidad.");
                return response;
            }
        } catch (Exception e) {
            captured = e;
        }

        response.put("source", captured != null ? "nominatim-error" : "nominatim-status-" + statusReceived);
        String detail = captured != null
                ? (captured.getMessage() == null ? captured.getClass().getSimpleName() : captured.getMessage())
                : (statusReceived != null ? "HTTP " + statusReceived : "desconocido");
        response.put("error", "No se pudo consultar la dirección (" + detail
                + "). Probá de nuevo, usá el mapa interactivo o agregá localidad.");
        return response;
    }
}

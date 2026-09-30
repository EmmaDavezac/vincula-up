package com.vinculaup.bff_web.controller;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final BackendGateway gateway;
    private final com.vinculaup.bff_web.service.KeycloakAdminService keycloakAdmin;
    private final com.vinculaup.bff_web.service.FotoStorage fotoStorage;
    private final com.vinculaup.bff_web.service.NotificacionService notificar;

    public ApiController(BackendGateway gateway, com.vinculaup.bff_web.service.KeycloakAdminService keycloakAdmin,
            com.vinculaup.bff_web.service.FotoStorage fotoStorage,
            com.vinculaup.bff_web.service.NotificacionService notificar) {
        this.gateway = gateway;
        this.keycloakAdmin = keycloakAdmin;
        this.fotoStorage = fotoStorage;
        this.notificar = notificar;
    }

    private JsonNode authenticatedUser() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Iniciá sesión para continuar");
        }
        JsonNode user = gateway.buscarUsuarioPorKeycloakId(UUID.fromString(jwt.getSubject()),
                jwt.getClaimAsString("email"), jwt.getClaimAsString("given_name"),
                jwt.getClaimAsString("family_name"), authenticatedRole());
        sincronizarRolProfesional(user);
        return requireActive(user);
    }

    /**
     * El profesional invitado se auto-registra en Keycloak con el email que cargó
     * el administrador: ms-usuarios lo reconoce como PROFESIONAL (por email) pero
     * su token todavía dice CLIENTE. Acá se promueve el rol en Keycloak para que
     * el próximo token lo traiga y pueda activar su perfil.
     * <p>
     * Sólo promueve CLIENTE → PROFESIONAL: nunca otorga ADMIN desde el padrón.
     */
    private void sincronizarRolProfesional(JsonNode user) {
        if (user == null || !"PROFESIONAL".equalsIgnoreCase(user.path("rolNegocio").asText(""))) {
            return;
        }
        if ("PROFESIONAL".equals(authenticatedRole())) {
            return;
        }
        keycloakAdmin.promoverAProfesional(authenticatedSubject());
    }

    /** Las cuentas baneadas no pueden operar: corta cualquier llamada autenticada. */
    private JsonNode requireActive(JsonNode user) {
        if (user != null && "SUSPENDIDO".equalsIgnoreCase(user.path("estado").asText(""))) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Tu cuenta está suspendida por incumplimiento de normas. Contactá a la universidad para revisar tu situación.");
        }
        return user;
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

    /**
     * Cuerpo para operar sobre una solicitud existente (aceptar, rechazar, completar, cancelar).
     * <p>
     * La identidad del actor sale siempre del token y se agrega el {@code subject} de Keycloak como
     * alias, porque las solicitudes históricas quedaron guardadas con esa identidad mientras que el
     * resto de la aplicación usa el id de ms-usuarios.
     */
    private JsonNode actorIdentityBody(JsonNode body, JsonNode user) {
        return actorIdentityBody(body, user, "actorId");
    }

    private JsonNode actorIdentityBody(JsonNode body, JsonNode user, String field) {
        JsonNode identity = identityBody(body, user, field);
        if (identity instanceof ObjectNode object) {
            object.put("keycloakId", authenticatedSubject().toString());
        }
        return identity;
    }

    @GetMapping("/profesionales")
    public JsonNode listarProfesionales(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Boolean todos) {
        return enriquecerConUsuarios(gateway.listarProfesionales(estado, todos));
    }

    /**
     * ms-profesionales solo devuelve el usuarioId de cada profesional: el nombre
     * y apellido reales viven en ms-usuarios. Los agregamos acá para que el
     * directorio y el flujo de solicitud muestren la identidad del profesional
     * en vez de un genérico con el legajo. Si ms-usuarios no puede responder por
     * un usuario, ese profesional se entrega sin datos personales en lugar de
     * tumbar la consulta completa.
     */
    private JsonNode enriquecerConUsuarios(JsonNode profesionales) {
        if (profesionales == null || !profesionales.isArray() || profesionales.isEmpty()) {
            return profesionales;
        }
        Map<UUID, JsonNode> usuarios = new HashMap<>();
        for (JsonNode profesional : profesionales) {
            if (!profesional.hasNonNull("usuarioId")) {
                continue;
            }
            try {
                UUID usuarioId = UUID.fromString(profesional.get("usuarioId").asText());
                usuarios.computeIfAbsent(usuarioId, id -> {
                    JsonNode usuario = gateway.buscarUsuarioPorId(id);
                    return usuario != null && usuario.isObject() ? usuario : null;
                });
            } catch (RuntimeException ignored) {
                // UUID inválido o usuario inexistente: se deja el profesional sin datos personales.
            }
        }
        Map<String, JsonNode> reputaciones = reputaciones();
        var enriquecidos = tools.jackson.databind.json.JsonMapper.builder().build().createArrayNode();
        for (JsonNode profesional : profesionales) {
            JsonNode usuario = null;
            try {
                usuario = usuarios.get(UUID.fromString(profesional.path("usuarioId").asText(null)));
            } catch (RuntimeException ignored) {
                // usuarioId inválido: se conserva el nodo original.
            }
            enriquecidos.add(conReputacion(enriquecerConUsuario(profesional, usuario), reputaciones));
        }
        return enriquecidos;
    }

    /**
     * Reputación de cada profesional (promedio y cantidad de reseñas), indexada
     * por id de perfil. Se pide una sola vez para todo el listado: consultar
     * profesional por profesional sería una llamada por tarjeta.
     * <p>
     * Si ms-solicitudes no responde, el listado se entrega igual sin estrellas:
     * la reputación es un dato adicional, no una condición para ver el padrón.
     */
    private Map<String, JsonNode> reputaciones() {
        Map<String, JsonNode> porProfesional = new HashMap<>();
        try {
            JsonNode resumen = gateway.listarResumenCalificaciones();
            if (resumen != null && resumen.isArray()) {
                for (JsonNode item : resumen) {
                    if (item.hasNonNull("profesionalId")) {
                        porProfesional.put(item.get("profesionalId").asText(), item);
                    }
                }
            }
        } catch (RuntimeException ignored) {
            // ms-solicitudes caído o lento: el padrón se muestra sin reputación.
        }
        return porProfesional;
    }

    /** Agrega promedio y cantidad de reseñas al nodo del profesional. */
    private JsonNode conReputacion(JsonNode profesional, Map<String, JsonNode> reputaciones) {
        if (profesional == null || !profesional.isObject() || reputaciones.isEmpty()) {
            return profesional;
        }
        JsonNode reputacion = reputaciones.get(profesional.path("id").asText(null));
        if (reputacion == null) {
            return profesional;
        }
        var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
        var copia = mapper.createObjectNode();
        copia.setAll((tools.jackson.databind.node.ObjectNode) profesional);
        copia.put("promedio", reputacion.path("promedio").asDouble(0d));
        copia.put("cantidadCalificaciones", reputacion.path("cantidad").asLong(0));
        return copia;
    }

    /**
     * Enriquecimiento de UN nodo de profesional con su ficha del padrón
     * (nombre, apellido y foto de respaldo). Reutilizado por el listado y por
     * la ficha individual que consume la tarjeta de la solicitud del cliente.
     */
    private JsonNode enriquecerUnProfesional(JsonNode profesional) {
        if (profesional == null || !profesional.isObject()) {
            return profesional;
        }
        JsonNode usuario = null;
        try {
            if (profesional.hasNonNull("usuarioId")) {
                usuario = gateway.buscarUsuarioPorId(UUID.fromString(profesional.get("usuarioId").asText()));
                if (usuario != null && !usuario.isObject()) {
                    usuario = null;
                }
            }
        } catch (RuntimeException ignored) {
            // UUID inválido o usuario inexistente: se dejan los datos del padrón.
        }
        return conReputacion(enriquecerConUsuario(profesional, usuario), reputaciones());
    }

    private JsonNode enriquecerConUsuario(JsonNode profesional, JsonNode usuario) {
        var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
        var copia = mapper.createObjectNode();
        copia.setAll((tools.jackson.databind.node.ObjectNode) profesional);
        if (usuario != null) {
            if (usuario.hasNonNull("nombre")) copia.put("nombre", usuario.get("nombre").asText());
            if (usuario.hasNonNull("apellido")) copia.put("apellido", usuario.get("apellido").asText());
            // La foto que se muestra es la de la cuenta (ms-usuarios), que es la que
            // la persona sube y actualiza desde "Mi cuenta". La del padrón queda como
            // respaldo para los perfiles cargados antes de que existiera la cuenta.
            // Ojo con la cadena vacía: un perfil sin foto la guarda como "" y, si se
            // tomara como "tiene foto", taparía la imagen real de la cuenta.
            if (usuario.hasNonNull("fotoUrl") && !usuario.get("fotoUrl").asText("").isBlank()) {
                copia.put("fotoUrl", usuario.get("fotoUrl").asText());
            } else if (!copia.hasNonNull("fotoUrl") || copia.get("fotoUrl").asText("").isBlank()) {
                copia.remove("fotoUrl");
            }
        }
        return copia;
    }

    /**
     * Ficha individual del profesional para la tarjeta de la solicitud del
     * cliente ("Con profesional: …"): nombre real, especialidad y foto. El id
     * de la solicitud suele ser el usuarioId; se resuelve en ese orden.
     */
    @GetMapping("/profesionales/{id}")
    public JsonNode obtenerProfesional(@PathVariable UUID id) {
        JsonNode profesional = gateway.buscarProfesionalPorIdOUsuario(id);
        return profesional == null ? null : enriquecerUnProfesional(profesional);
    }

    @PostMapping("/profesionales")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearProfesional(@RequestBody JsonNode body) {
        return gateway.crearProfesional(body);
    }

    /**
     * Activación del perfil profesional.
     * <p>
     * La foto se sube aparte a {@code POST /api/fotos} y llega como URL pública.
     * Ese dato tiene que quedar en <b>ms-usuarios</b>, que es de donde la lee la
     * aplicación (el perfil de ms-profesionales es un padrón técnico y no muestra
     * fotos). Antes solo se guardaba del lado de ms-profesionales, con lo que la
     * imagen se perdía: el archivo quedaba subido al almacenamiento y la URL,
     * huérfana.
     */
    @RequestMapping(value = "/profesionales/activar", method = {RequestMethod.PATCH, RequestMethod.POST, RequestMethod.PUT})
    public JsonNode activarProfesional(@RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        professionalProfile(user, false);
        JsonNode resultado = gateway.activarProfesional(identityBody(body, user, "usuarioId"));
        guardarFotoEnUsuario(body, user);
        return resultado;
    }

    /**
     * Copia la foto activada a la cuenta del usuario.
     * <p>
     * Es best-effort a propósito: si ms-usuarios no responde, el perfil ya quedó
     * activo y con su zona, y frenar la activación dejaría al profesional sin
     * servicio. El frontend igual puede reenviar la foto desde "Mi cuenta".
     */
    private void guardarFotoEnUsuario(JsonNode body, JsonNode user) {
        String fotoUrl = body.path("fotoUrl").asText("").trim();
        if (fotoUrl.isEmpty() || user == null || !user.hasNonNull("id")) {
            return;
        }
        try {
            var foto = tools.jackson.databind.json.JsonMapper.builder().build().createObjectNode();
            foto.put("fotoUrl", fotoUrl);
            gateway.actualizarUsuario(UUID.fromString(user.get("id").asText()), foto);
        } catch (RuntimeException ignored) {
            // Ver el javadoc: la activación ya está confirmada y no debe abortarse.
        }
    }

    @GetMapping("/profesionales/mi-perfil")
    public ResponseEntity<JsonNode> miPerfil(
            @RequestParam UUID usuarioId,
            @RequestParam(required = false) UUID keycloakId) {
        JsonNode profile = professionalProfile(authenticatedUser(), false);
        return profile == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(profile);
    }

    /**
     * Reputación del profesional autenticado: promedio y las reseñas que recibió,
     * con el nombre de quien las dejó (ese nombre vive en ms-usuarios).
     * <p>
     * El id del profesional sale de la sesión, nunca de un parámetro: un
     * profesional no puede consultar la reputación de otro.
     */
    @GetMapping("/mi-reputacion")
    public JsonNode miReputacion() {
        var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
        var vacio = mapper.createObjectNode();
        vacio.put("promedio", 0d);
        vacio.put("cantidad", 0);
        vacio.set("resenas", mapper.createArrayNode());

        JsonNode profile = professionalProfile(authenticatedUser(), false);
        if (profile == null || !profile.hasNonNull("id")) {
            // Todavía no completó el alta en el padrón: no tiene reputación.
            return vacio;
        }
        JsonNode reputacion;
        try {
            reputacion = gateway.reputacionDe(UUID.fromString(profile.get("id").asText()));
        } catch (RuntimeException exception) {
            // ms-solicitudes no responde: se devuelve vacío y la tarjeta avisa.
            return vacio;
        }
        if (reputacion == null || !reputacion.isObject()) {
            return vacio;
        }

        Map<UUID, String> nombres = new HashMap<>();
        var resenas = mapper.createArrayNode();
        for (JsonNode resena : reputacion.path("resenas")) {
            UUID clienteId = null;
            JsonNode nodoCliente = resena.get("clienteId");
            if (nodoCliente != null && !nodoCliente.isNull()) {
                try {
                    clienteId = UUID.fromString(nodoCliente.asText());
                } catch (RuntimeException ignored) {
                    // Id de cliente con formato inesperado: la reseña va sin nombre.
                }
            }
            if (clienteId != null) {
                nombres.computeIfAbsent(clienteId, key -> {
                    JsonNode usuario = gateway.buscarUsuarioPorId(key);
                    if (usuario == null || !usuario.isObject()) {
                        return null;
                    }
                    String nombre = List.of(
                            usuario.path("nombre").asText(""),
                            usuario.path("apellido").asText("")).stream()
                            .filter(part -> !part.isBlank())
                            .reduce((a, b) -> a + " " + b)
                            .orElse("");
                    return nombre.isBlank() ? null : nombre;
                });
            }
            var copia = mapper.createObjectNode();
            copia.setAll((tools.jackson.databind.node.ObjectNode) resena);
            String nombre = clienteId == null ? null : nombres.get(clienteId);
            copia.put("clienteNombre", nombre != null ? nombre : "Cliente de Vincula-UP");
            resenas.add(copia);
        }

        var respuesta = mapper.createObjectNode();
        respuesta.put("promedio", reputacion.path("promedio").asDouble(0d));
        respuesta.put("cantidad", reputacion.path("cantidad").asLong(0));
        respuesta.set("resenas", resenas);
        return respuesta;
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

    // El padrón de profesionales no se borra: la baja es lógica (PATCH /suspender).
    // Un profesional dado de alta conserva su historial de solicitudes y calificaciones.

    @PostMapping("/usuarios")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearUsuario(@RequestBody JsonNode body) { return gateway.crearUsuario(body); }

    /**
     * Alta administrativa de un profesional en un solo paso: crea el usuario
     * <b>invitado</b> en ms-usuarios (todavía sin cuenta Keycloak) y su perfil
     * profesional pendiente de activación.
     * <p>
     * Si el email ya existe (por ejemplo una invitación previa) se reutiliza ese
     * usuario; si la creación del perfil falla y el usuario se acababa de crear,
     * se elimina para no dejar invitaciones huérfanas.
     */
    @PostMapping("/profesionales/alta")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode altaProfesional(@RequestBody JsonNode body) {
        if (!(body instanceof tools.jackson.databind.node.ObjectNode object)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Se esperaba un objeto");
        }
        String email = object.path("email").asText("").trim();
        String legajo = object.path("legajo").asText("").trim();
        if (email.isEmpty() || legajo.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El email y el legajo son obligatorios");
        }

        var mapper = tools.jackson.databind.json.JsonMapper.builder().build();

        JsonNode usuario = gateway.buscarUsuarioPorEmail(email);
        boolean usuarioNuevo = false;
        if (usuario == null) {
            var usuarioBody = mapper.createObjectNode();
            usuarioBody.put("nombre", object.path("nombre").asText(""));
            usuarioBody.put("apellido", object.path("apellido").asText(""));
            usuarioBody.put("email", email);
            usuarioBody.put("telefono", object.path("telefono").asText(""));
            usuarioBody.put("rolNegocio", "PROFESIONAL");
            usuario = gateway.crearUsuario(usuarioBody);
            usuarioNuevo = true;
        }

        var perfilBody = mapper.createObjectNode();
        perfilBody.put("usuarioId", usuario.path("id").asText());
        perfilBody.put("legajo", legajo);
        var especialidades = mapper.createArrayNode();
        for (JsonNode especialidadId : object.path("especialidadIds")) {
            especialidades.add(especialidadId.asText());
        }
        perfilBody.set("especialidadIds", especialidades);

        try {
            JsonNode perfil = gateway.crearProfesional(perfilBody);
            // Aviso best-effort: si el correo no sale, el prerregistro ya quedó
            // guardado y el administrador puede avisar por otra vía.
            notificar.avisarPrerregistro(
                    email,
                    nombreCompleto(object),
                    legajo,
                    primeraEspecialidad(perfil));
            var respuesta = mapper.createObjectNode();
            respuesta.set("usuario", usuario);
            respuesta.set("profesional", perfil);
            return respuesta;
        } catch (RuntimeException ex) {
            if (usuarioNuevo) {
                try {
                    gateway.eliminarUsuario(UUID.fromString(usuario.path("id").asText()));
                } catch (RuntimeException rollback) {
                    org.slf4j.LoggerFactory.getLogger(ApiController.class)
                            .warn("No se pudo revertir el usuario invitado {}: {}",
                                    usuario.path("id").asText(), rollback.getMessage());
                }
            }
            throw ex;
        }
    }

    /** Devuelve el usuario por email o 204 cuando no existe (invitación pendiente de alta). */
    @GetMapping("/usuarios/por-email")
    public ResponseEntity<JsonNode> buscarUsuarioPorEmail(@RequestParam String email) {
        JsonNode usuario = gateway.buscarUsuarioPorEmail(email);
        return usuario == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(usuario);
    }

    /** Nombre y apellido del cuerpo del alta, para el saludo del correo. */
    private String nombreCompleto(JsonNode body) {
        String nombre = body.path("nombre").asText("").trim();
        String apellido = body.path("apellido").asText("").trim();
        return (nombre + " " + apellido).trim();
    }

    /**
     * Nombre de la primera especialidad del perfil recién creado, para el correo
     * de prerregistro. Viene anidada en la respuesta de ms-profesionales; si no
     * está, se devuelve vacío y el aviso sale igual sin ese detalle.
     */
    private String primeraEspecialidad(JsonNode perfil) {
        for (JsonNode especialidad : perfil.path("especialidades")) {
            String nombre = especialidad.path("nombre").asText("").trim();
            if (!nombre.isEmpty()) {
                return nombre;
            }
        }
        return "";
    }

    /** Baneo de una cuenta (clientes incluidos) por incumplimiento de normas. */
    @PatchMapping("/usuarios/{id}/suspender")
    public JsonNode suspenderUsuario(@PathVariable UUID id) { return gateway.suspenderUsuario(id); }

    /** Levanta el baneo y devuelve la cuenta a ACTIVO. */
    @PatchMapping("/usuarios/{id}/reactivar")
    public JsonNode reactivarUsuario(@PathVariable UUID id) { return gateway.reactivarUsuario(id); }

    @PatchMapping("/usuarios/{id}")
    public JsonNode actualizarUsuario(@PathVariable UUID id, @RequestBody JsonNode body) { return gateway.actualizarUsuario(id, body); }

    /**
     * Actualización del perfil propio ("Mi cuenta"). El id se resuelve desde el
     * token, nunca desde la URL: así un usuario sólo puede editar su propia
     * cuenta (sin IDOR posible) y el email se ignora siempre.
     */
    @PatchMapping("/usuarios/yo")
    public JsonNode actualizarMiPerfil(@RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        ObjectNode propio = tools.jackson.databind.json.JsonMapper.builder().build().createObjectNode();
        if (body.has("nombre")) propio.set("nombre", body.get("nombre"));
        if (body.has("apellido")) propio.set("apellido", body.get("apellido"));
        if (body.has("telefono")) propio.set("telefono", body.get("telefono"));
        if (body.has("fotoUrl")) propio.set("fotoUrl", body.get("fotoUrl"));
        return gateway.actualizarUsuario(userId(user), propio);
    }

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
    public JsonNode listarUsuarios(
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) String estado) {
        return gateway.listarUsuarios(rol, estado);
    }

    /**
     * Perfil propio ("Mi cuenta"): lectura. El id se resuelve desde el token.
     * Debe declararse ANTES que {@code /usuarios/{id}} para que Spring no
     * intente bindear "yo" como UUID.
     */
    @GetMapping("/usuarios/yo")
    public JsonNode miCuenta() { return authenticatedUser(); }

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
        return ocultarDireccionSiEstaPendiente(
                gateway.listarSolicitudes(userId(user), List.of(authenticatedSubject()),
                        "PROFESIONAL".equals(role) ? "RECIBIDAS" : "ENVIADAS", role),
                role);
    }

    /**
     * Le oculta al profesional la dirección exacta del cliente mientras la
     * solicitud sigue pendiente.
     * <p>
     * El domicilio se revela recién cuando el profesional acepta: así puede decidir
     * si le conviene sin conocer beforehand la calle exacta, y el vecino no expone
     * su casa a un tercero que todavia se ocupo del turno.
     * <p>
     * En lugar de la dirección se devuelve la <b>zona</b> (barrio y localidad) y las
     * coordenadas redondeadas a 2 decimales, que equivalen a una precisión de
     * ~1,1 km: alcanzan para saber si la zona es conocida o si queda lejos, pero
     * no para localizar una casa. Con 3 decimales el margen sería de ~110 m, que
     * ya es demasiado cerca.
     * <p>
     * El cliente no pasa por acá: él siempre ve su propia dirección. Y a partir de
     * ACEPTADA el profesional ve todo, porque ya se comprometió a ir.
     */
    private JsonNode ocultarDireccionSiEstaPendiente(JsonNode solicitudes, String role) {
        if (!"PROFESIONAL".equals(role) || solicitudes == null || !solicitudes.isArray()) {
            return solicitudes;
        }
        var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
        var resultado = mapper.createArrayNode();
        for (JsonNode solicitud : solicitudes) {
            var copia = mapper.createObjectNode();
            copia.setAll((tools.jackson.databind.node.ObjectNode) solicitud);

            boolean pendiente = "PENDIENTE".equalsIgnoreCase(copia.path("estado").asText(""));
            if (pendiente) {
                String zona = copia.path("zonaAproximada").asText(null);
                if (zona != null && !zona.isBlank()) {
                    copia.put("direccionServicio", zona);
                } else {
                    // Sin zona calculada no se inventa nada: el frontend muestra que
                    // la dirección exacta se ve al aceptar.
                    copia.remove("direccionServicio");
                }
                redondearCoordenada(copia, "latitud");
                redondearCoordenada(copia, "longitud");
            }
            resultado.add(copia);
        }
        return resultado;
    }

    /** Redondea a 2 decimales (~1,1 km) la coordenada indicada, si viene presente. */
    private void redondearCoordenada(tools.jackson.databind.node.ObjectNode nodo, String campo) {
        var valor = nodo.get(campo);
        if (valor != null && valor.isNumber()) {
            nodo.put(campo, Math.round(valor.asDouble() * 100.0) / 100.0);
        }
    }

    /**
     * Solicitudes de toda la plataforma para el dashboard de administración (embudo del
     * servicio, demanda por especialidad y satisfacción). Reservado al rol ADMIN.
     */
    @GetMapping("/solicitudes/panel")
    public JsonNode listarSolicitudesPanel() {
        authenticatedUser();
        if (!"ADMIN".equals(authenticatedRole())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Rol no autorizado");
        }
        return gateway.listarSolicitudesParaPanel();
    }

    @PatchMapping("/solicitudes/{id}/aceptar")
    public JsonNode aceptar(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        professionalProfile(user, true);
        return gateway.aceptarSolicitud(id, actorIdentityBody(body, user));
    }

    @PatchMapping("/solicitudes/{id}/rechazar")
    public JsonNode rechazar(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        professionalProfile(user, true);
        return gateway.rechazarSolicitud(id, actorIdentityBody(body, user));
    }

    /** Cualquiera de los dos lados puede dar el turno por terminado. */
    @PatchMapping("/solicitudes/{id}/completar")
    public JsonNode completar(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        return gateway.completarSolicitud(id, actorIdentityBody(body, user));
    }

    /** Lo mismo para cancelar: disponible para cliente y profesional. */
    @PatchMapping("/solicitudes/{id}/cancelar")
    public JsonNode cancelar(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        return gateway.cancelarSolicitud(id, actorIdentityBody(body, user));
    }

    /**
     * Mensajes de la solicitud. La identidad se resuelve desde el token (el {@code usuarioId} que
     * manda el frontend se ignora) y se agrega el subject de Keycloak como alias, porque las
     * solicitudes históricas guardaron esa identidad como participante.
     */
    @GetMapping("/solicitudes/{id}/mensajes")
    public JsonNode listarMensajes(@PathVariable UUID id, @RequestParam(required = false) UUID usuarioId) {
        JsonNode user = authenticatedUser();
        return gateway.listarMensajes(id, userId(user), authenticatedSubject());
    }

    @PostMapping("/solicitudes/{id}/mensajes")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode enviarMensaje(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        return gateway.enviarMensaje(id, actorIdentityBody(body, user, "emisorId"));
    }

    @PostMapping("/solicitudes/{id}/calificacion")
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crearCalificacion(@PathVariable UUID id, @RequestBody JsonNode body) {
        JsonNode user = authenticatedUser();
        return gateway.crearCalificacion(id, actorIdentityBody(body, user, "clienteId"));
    }

    @GetMapping("/solicitudes/{id}/calificacion")
    public JsonNode obtenerCalificacion(@PathVariable UUID id) {
        return gateway.obtenerCalificacion(id);
    }

    /**
     * Sube una foto al almacenamiento y devuelve su URL pública.
     * <p>
     * Vive acá y no en cada microservicio para no duplicar el cliente de
     * almacenamiento en dos servicios, y porque el BFF ya es quien valida
     * sesión y rol. Los servicios de dominio solo reciben la URL: nunca ven el
     * archivo.
     */
    @PostMapping("/fotos")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> subirFoto(@RequestPart("archivo") MultipartFile archivo) {
        authenticatedUser();
        var subida = fotoStorage.subir(archivo);
        return Map.of("url", subida.url(), "key", subida.key());
    }

    /**
     * Geocodifica una direccion delegando en ms-solicitudes.
     * <p>
     * La implementacion de Nominatim vive una sola vez, en el
     * {@code GeocodingClient} de ms-solicitudes: antes estaba duplicada (68
     * lineas aca con un timeout de 8s y otra en el microservicio con 5s), sin
     * cache y sin rate limiting. Proxiar ademas aprovecha la cache del cliente.
     * <p>
     * La ruta publica no cambia, asi que el frontend no se entera.
     */
    @GetMapping("/gps")
    public Map<String, Object> obtenerUbicacionGps(@RequestParam(required = false, defaultValue = "") String direccion) {
        return gateway.geocodificar(direccion);
    }
}

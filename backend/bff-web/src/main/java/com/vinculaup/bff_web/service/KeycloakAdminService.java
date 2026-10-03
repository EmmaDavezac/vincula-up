package com.vinculaup.bff_web.service;

import tools.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Administración mínima de identidades en Keycloak a través de la Admin API.
 * <p>
 * El alta de un profesional la hace el administrador: el BFF crea la cuenta acá
 * con una <b>contraseña temporal</b> y le asigna el rol PROFESIONAL, de modo que
 * el profesional <b>sólo tenga que activar su perfil</b> (no se registra solo).
 * El rol sigue viviendo en un único lugar (Keycloak) y el BFF no necesita
 * autorizar por su cuenta.
 * <p>
 * Nunca otorga ADMIN: la asignación automática sólo puede ser CLIENTE →
 * PROFESIONAL, así un error de datos en el padrón no escala privilegios.
 * <p>
 * Todas las operaciones son best-effort: si Keycloak no responde se registra un
 * warning y el flujo continúa. La promoción de un prerregistro antiguo (el que se
 * registraba solo) se reintenta en el próximo login.
 */
@Service
public class KeycloakAdminService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakAdminService.class);
    private static final String ROL_CLIENTE = "CLIENTE";
    private static final String ROL_PROFESIONAL = "PROFESIONAL";
    private static final String AUTHORIZATION = "Authorization";
    /** Secreto de demo versionado en el repositorio: sirve para local, no para exponer. */
    private static final String SECRETO_DEMO = "vincula-up-admin-secret";

    private final RestClient client;
    private final String realm;
    private final String clientId;
    private final String clientSecret;

    private String cachedToken;
    private Instant cachedTokenExpiry = Instant.EPOCH;

    public KeycloakAdminService(
            @Value("${keycloak.admin.base-url:http://localhost:8080}") String baseUrl,
            @Value("${keycloak.admin.realm:vincula-up}") String realm,
            @Value("${keycloak.admin.client-id:}") String clientId,
            @Value("${keycloak.admin.client-secret:}") String clientSecret) {
        this.client = RestClient.builder().baseUrl(baseUrl).build();
        this.realm = realm;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        // El arranque no falla por un secreto mal puesto: la promoción es
        // best-effort y se reintenta en cada login. Pero conviene que quede en
        // el log, porque si no el síntoma es "el profesional entra y sigue
        // siendo CLIENTE", sin ningún error visible.
        if (!habilitado()) {
            log.warn("Administración de Keycloak deshabilitada: falta client-id o client-secret "
                    + "(KEYCLOAK_ADMIN_CLIENT_ID / KEYCLOAK_ADMIN_CLIENT_SECRET). La promoción a "
                    + "PROFESIONAL del profesional invitado no va a funcionar.");
        } else if (SECRETO_DEMO.equals(clientSecret)) {
            log.warn("El client de servicio usa el secreto de DEMO, que es público (está en el "
                    + "repositorio). Alcanza para local, pero hay que rotarlo antes de exponer el "
                    + "stack: ver README, 'El secreto del client de servicio'.");
        }
    }

    /** Sin credenciales de servicio la administración de Keycloak queda deshabilitada. */
    public boolean habilitado() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }

    /**
     * Promueve la cuenta auto-registrada de un profesional: otorga PROFESIONAL y
     * retira CLIENTE para que el token nuevo traiga un único rol de negocio.
     * <p>
     * Se mantiene para los prerregistros antiguos (los que se registraban solos en
     * Keycloak antes de que el alta creara la cuenta). En el flujo actual el rol ya
     * se asigna al crear el usuario, así que esto sólo actúa como red de seguridad.
     *
     * @return {@code true} cuando la sincronización se aplicó en Keycloak.
     */
    public boolean promoverAProfesional(UUID keycloakUserId) {
        return asignarRolProfesional(keycloakUserId);
    }

    /**
     * Otorga el rol PROFESIONAL en Keycloak y retira CLIENTE si lo tuviera.
     * <p>
     * Nunca otorga ADMIN: la asignación sólo puede ser CLIENTE → PROFESIONAL, así
     * un error de datos en el padrón no escala privilegios.
     *
     * @return {@code true} cuando el rol quedó aplicado en Keycloak.
     */
    public boolean asignarRolProfesional(UUID keycloakUserId) {
        if (!habilitado() || keycloakUserId == null) {
            return false;
        }
        Optional<String> token = token();
        if (token.isEmpty()) {
            return false;
        }
        try {
            JsonNode rolProfesional = buscarRol(ROL_PROFESIONAL, token.get());
            if (rolProfesional == null || !rolProfesional.hasNonNull("id")) {
                log.warn("El rol {} no existe en el realm {}: no se pudo asignar al usuario {}",
                        ROL_PROFESIONAL, realm, keycloakUserId);
                return false;
            }
            mapear(rolProfesional, keycloakUserId, token.get());

            JsonNode rolCliente = buscarRol(ROL_CLIENTE, token.get());
            if (rolCliente != null && rolCliente.hasNonNull("id")) {
                desmapear(rolCliente, keycloakUserId, token.get());
            }
            log.info("Rol {} otorgado en Keycloak al usuario {}", ROL_PROFESIONAL, keycloakUserId);
            return true;
        } catch (RuntimeException ex) {
            log.warn("No se pudo asignar el rol {} al usuario {}: {}", ROL_PROFESIONAL, keycloakUserId, ex.getMessage());
            return false;
        }
    }

    /**
     * Crea la cuenta del profesional con una contraseña temporal y la acción
     * pendiente de cambiarla en el primer ingreso. Devuelve el id de Keycloak
     * (extraído del {@code Location} del alta) o {@code null} si no se pudo.
     * <p>
     * El correo es además el {@code username}: el realm usa
     * {@code registrationEmailAsUsername}, así que la persona entra con su correo.
     * {@code emailVerified} va en {@code true} porque la dirección la carga el
     * administrador; el realm no verifica correos, así que sin eso quedaría como no
     * confirmada.
     */
    public UUID crearUsuarioConContrasenaTemporal(String email, String nombre, String apellido, String passwordTemporal) {
        if (!habilitado() || email == null || email.isBlank()
                || passwordTemporal == null || passwordTemporal.isBlank()) {
            return null;
        }
        Optional<String> token = token();
        if (token.isEmpty()) {
            return null;
        }
        try {
            var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
            var cuerpo = mapper.createObjectNode();
            cuerpo.put("username", email.trim().toLowerCase(Locale.ROOT));
            cuerpo.put("email", email.trim());
            cuerpo.put("firstName", nombre == null ? "" : nombre.trim());
            cuerpo.put("lastName", apellido == null ? "" : apellido.trim());
            cuerpo.put("enabled", true);
            cuerpo.put("emailVerified", true);
            cuerpo.putArray("requiredActions").add("UPDATE_PASSWORD");
            var credencial = cuerpo.putArray("credentials").addObject();
            credencial.put("type", "password");
            credencial.put("value", passwordTemporal);
            credencial.put("temporary", true);

            var respuesta = client.post()
                    .uri("/admin/realms/{realm}/users", realm)
                    .header(AUTHORIZATION, bearer(token.get()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(cuerpo)
                    .retrieve()
                    .toBodilessEntity();
            String location = respuesta.getHeaders().getFirst("Location");
            if (location == null || location.isBlank()) {
                log.warn("Keycloak no devolvió la ubicación de la cuenta creada para {}", email);
                return null;
            }
            return UUID.fromString(location.substring(location.lastIndexOf('/') + 1));
        } catch (RuntimeException ex) {
            log.warn("No se pudo crear la cuenta de Keycloak para {}: {}", email, ex.getMessage());
            return null;
        }
    }

    /** Id de la cuenta de Keycloak con ese correo, si existe (busqueda exacta). */
    public Optional<UUID> buscarUsuarioPorEmail(String email) {
        if (!habilitado() || email == null || email.isBlank()) {
            return Optional.empty();
        }
        Optional<String> token = token();
        if (token.isEmpty()) {
            return Optional.empty();
        }
        try {
            JsonNode usuarios = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/admin/realms/{realm}/users")
                            .queryParam("email", email.trim())
                            .queryParam("exact", "true")
                            .build(realm))
                    .header(AUTHORIZATION, bearer(token.get()))
                    .retrieve()
                    .body(JsonNode.class);
            if (usuarios == null || !usuarios.isArray() || usuarios.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(UUID.fromString(usuarios.get(0).path("id").asText()));
        } catch (RuntimeException ex) {
            // Ante la duda no se bloquea el alta: ms-usuarios igual rechaza el email duplicado.
            log.warn("No se pudo consultar en Keycloak si existe {}: {}", email, ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * ¿La cuenta tiene una acción requerida pendiente (por ejemplo
     * {@code UPDATE_PASSWORD})? Devuelve {@code null} cuando no se pudo leer la
     * cuenta, para no confundir un fallo de red con "ya activó".
     */
    public Boolean tieneAccionPendiente(UUID keycloakUserId, String accion) {
        if (!habilitado() || keycloakUserId == null || accion == null || accion.isBlank()) {
            return null;
        }
        Optional<String> token = token();
        if (token.isEmpty()) {
            return null;
        }
        try {
            JsonNode cuenta = client.get()
                    .uri("/admin/realms/{realm}/users/{id}", realm, keycloakUserId)
                    .header(AUTHORIZATION, bearer(token.get()))
                    .retrieve()
                    .body(JsonNode.class);
            if (cuenta == null || !cuenta.isObject()) {
                return null;
            }
            for (JsonNode pendiente : cuenta.path("requiredActions")) {
                if (accion.equalsIgnoreCase(pendiente.asText(""))) {
                    return true;
                }
            }
            return false;
        } catch (RuntimeException ex) {
            log.warn("No se pudo leer las acciones pendientes de {}: {}", keycloakUserId, ex.getMessage());
            return null;
        }
    }

    /**
     * Emite la contraseña temporal recibida para una cuenta existente.
     * <p>
     * Es el "reenviar invitación" del panel: deja la clave como temporal con
     * {@code UPDATE_PASSWORD} pendiente. La contraseña la genera el controlador
     * (igual que en el alta), así este servicio sólo la aplica y la confirma.
     *
     * @return {@code true} si la clave quedó aplicada en Keycloak.
     */
    public boolean resetearContrasenaTemporal(UUID keycloakUserId, String passwordTemporal) {
        if (!habilitado() || keycloakUserId == null
                || passwordTemporal == null || passwordTemporal.isBlank()) {
            return false;
        }
        Optional<String> token = token();
        if (token.isEmpty()) {
            return false;
        }
        try {
            var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
            var credencial = mapper.createObjectNode();
            credencial.put("type", "password");
            credencial.put("value", passwordTemporal);
            credencial.put("temporary", true);
            client.put()
                    .uri("/admin/realms/{realm}/users/{id}/reset-password", realm, keycloakUserId)
                    .header(AUTHORIZATION, bearer(token.get()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(credencial)
                    .retrieve()
                    .toBodilessEntity();
            var cuerpo = mapper.createObjectNode();
            cuerpo.putArray("requiredActions").add("UPDATE_PASSWORD");
            client.put()
                    .uri("/admin/realms/{realm}/users/{id}", realm, keycloakUserId)
                    .header(AUTHORIZATION, bearer(token.get()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(cuerpo)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Contraseña temporal reemitida en Keycloak para el usuario {}", keycloakUserId);
            return true;
        } catch (RuntimeException ex) {
            log.warn("No se pudo reemitir la contraseña temporal para {}: {}",
                    keycloakUserId, ex.getMessage());
            return false;
        }
    }

    /** Baja la cuenta en Keycloak (rollback de un alta que no llegó a completarse). */
    public void eliminarUsuario(UUID keycloakUserId) {
        if (!habilitado() || keycloakUserId == null) {
            return;
        }
        Optional<String> token = token();
        if (token.isEmpty()) {
            return;
        }
        try {
            client.delete()
                    .uri("/admin/realms/{realm}/users/{id}", realm, keycloakUserId)
                    .header(AUTHORIZATION, bearer(token.get()))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RuntimeException ex) {
            log.warn("No se pudo eliminar la cuenta de Keycloak {}: {}", keycloakUserId, ex.getMessage());
        }
    }

    private void mapear(JsonNode rol, UUID keycloakUserId, String token) {
        client.post()
                .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, keycloakUserId)
                .header(AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(rol))
                .retrieve()
                .toBodilessEntity();
    }

    private void desmapear(JsonNode rol, UUID keycloakUserId, String token) {
        client.method(HttpMethod.DELETE)
                .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, keycloakUserId)
                .header(AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(rol))
                .retrieve()
                .toBodilessEntity();
    }

    private JsonNode buscarRol(String nombre, String token) {
        return client.get()
                .uri("/admin/realms/{realm}/roles/{rol}", realm, nombre)
                .header(AUTHORIZATION, bearer(token))
                .retrieve()
                .body(JsonNode.class);
    }

    /** Token de servicio con cache: se renueva 30s antes de expirar. */
    private Optional<String> token() {
        if (cachedToken != null && Instant.now().isBefore(cachedTokenExpiry)) {
            return Optional.of(cachedToken);
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);

            JsonNode response = client.post()
                    .uri("/realms/{realm}/protocol/openid-connect/token", realm)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(JsonNode.class);

            String accessToken = response == null ? null : response.path("access_token").asText(null);
            if (accessToken == null || accessToken.isBlank()) {
                log.warn("Keycloak no devolvió access_token para el client de servicio {}", clientId);
                return Optional.empty();
            }
            long expiresIn = response.path("expires_in").asLong(60);
            cachedToken = accessToken;
            cachedTokenExpiry = Instant.now().plusSeconds(Math.max(30, expiresIn - 30));
            return Optional.of(accessToken);
        } catch (RuntimeException ex) {
            log.warn("No se pudo obtener el token de servicio de Keycloak ({}): {}", clientId, ex.getMessage());
            return Optional.empty();
        }
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
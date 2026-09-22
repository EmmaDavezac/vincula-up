package com.vinculaup.bff_web.service;

import tools.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
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
 * El flujo de profesionales es una invitación: el administrador precarga los
 * datos en ms-usuarios (sin cuenta Keycloak) y el profesional <b>se registra
 * solo</b> en Keycloak con ese email. Al entrar por primera vez el padrón lo
 * reconoce como profesional, pero el token todavía dice CLIENTE, por lo que
 * acá le otorgamos el rol PROFESIONAL en Keycloak: el rol sigue viviendo en un
 * único lugar (Keycloak) y el BFF no necesita autorizar por su cuenta.
 * <p>
 * Nunca otorga ADMIN: la promoción automática sólo puede ser CLIENTE →
 * PROFESIONAL, así un error de datos en el padrón no escala privilegios.
 * <p>
 * Todas las operaciones son best-effort: si Keycloak no responde se registra un
 * warning y el flujo continúa (la promoción se reintenta en el próximo login).
 */
@Service
public class KeycloakAdminService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakAdminService.class);
    private static final String ROL_CLIENTE = "CLIENTE";
    private static final String ROL_PROFESIONAL = "PROFESIONAL";
    private static final String AUTHORIZATION = "Authorization";

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
    }

    /** Sin credenciales de servicio la administración de Keycloak queda deshabilitada. */
    public boolean habilitado() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }

    /**
     * Promueve la cuenta auto-registrada de un profesional: otorga PROFESIONAL y
     * retira CLIENTE para que el token nuevo traiga un único rol de negocio.
     *
     * @return {@code true} cuando la sincronización se aplicó en Keycloak.
     */
    public boolean promoverAProfesional(UUID keycloakUserId) {
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
                log.warn("El rol {} no existe en el realm {}: no se pudo promover al usuario {}",
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
            log.warn("No se pudo promover al usuario {} en Keycloak: {}", keycloakUserId, ex.getMessage());
            return false;
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
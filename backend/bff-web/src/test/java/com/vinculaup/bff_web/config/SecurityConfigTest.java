package com.vinculaup.bff_web.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class SecurityConfigTest {

    private final SecurityConfig securityConfig = new SecurityConfig();

    @Test
    void profesionalConRolClientePorDefectoSoloRecibeAutoridadProfesional() {
        assertEquals(List.of("ROLE_PROFESIONAL"), authorities("CLIENTE", "PROFESIONAL"));
    }

    @Test
    void administradorConRolClientePorDefectoSoloRecibeAutoridadAdmin() {
        assertEquals(List.of("ROLE_ADMIN"), authorities("CLIENTE", "ADMIN"));
    }

    @Test
    void clienteConservaSuUnicaAutoridadDeNegocio() {
        assertEquals(List.of("ROLE_CLIENTE"), authorities("CLIENTE"));
    }

    @Test
    void rechazaTokensExpiradosAunqueElEmisorSeaVinculaUp() {
        Instant now = Instant.now();
        Jwt expired = token("http://keycloak/realms/vincula-up", now.minusSeconds(180), now.minusSeconds(120));

        assertTrue(securityConfig.tokenValidator().validate(expired).hasErrors());
    }

    @Test
    void rechazaTokensQueTodaviaNoSonVigentes() {
        Instant now = Instant.now();
        Jwt notYetValid = token("http://keycloak/realms/vincula-up", now, now.plusSeconds(180),
                now.plusSeconds(120));

        assertTrue(securityConfig.tokenValidator().validate(notYetValid).hasErrors());
    }

    @Test
    void rechazaTokensDeOtroEmisor() {
        Instant now = Instant.now();

        assertTrue(securityConfig.tokenValidator()
                .validate(token("http://keycloak/realms/otro", now, now.plusSeconds(180)))
                .hasErrors());
    }

    @Test
    void aceptaTokensVigentesDelRealmEsperado() {
        Instant now = Instant.now();

        assertTrue(securityConfig.tokenValidator()
                .validate(token("http://keycloak/realms/vincula-up", now, now.plusSeconds(180)))
                .getErrors().isEmpty());
    }

    private Jwt token(String issuer, Instant issuedAt, Instant expiresAt) {
        return token(issuer, issuedAt, expiresAt, null);
    }

    private Jwt token(String issuer, Instant issuedAt, Instant expiresAt, Instant notBefore) {
        var builder = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .issuer(issuer)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt);
        if (notBefore != null) {
            builder.notBefore(notBefore);
        }
        return builder.build();
    }

    private List<String> authorities(String... roles) {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .claim("realm_access", Map.of("roles", List.of(roles)))
                .build();
        return securityConfig.jwtAuthenticationConverter().convert(jwt).getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(authority -> authority.startsWith("ROLE_"))
                .toList();
    }
}

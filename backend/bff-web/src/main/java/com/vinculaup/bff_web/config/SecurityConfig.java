package com.vinculaup.bff_web.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Arrays;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/profesionales").permitAll()
                // La reputación se muestra en el directorio y al elegir profesional: es pública.
                .requestMatchers(HttpMethod.GET, "/api/calificaciones").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/especialidades").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/gps").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/usuarios/por-keycloak").authenticated()
                .requestMatchers("/api/profesionales/activar", "/api/profesionales/mi-perfil", "/api/profesionales/vincular").hasRole("PROFESIONAL")
                // ADMIN permissions
                .requestMatchers(HttpMethod.GET, "/api/solicitudes/panel").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/usuarios").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/usuarios/yo", "/api/usuarios/por-keycloak").authenticated()
                // Ficha de la contraparte: el profesional necesita los datos del
                // cliente (y viceversa) para coordinar la solicitud, así que la
                // lectura de un usuario por id exige sesión válida, no un rol puntual.
                .requestMatchers(HttpMethod.GET, "/api/usuarios/*").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/yo").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/especialidades", "/api/usuarios").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/especialidades/*", "/api/profesionales/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/*").hasRole("ADMIN")
                // El padrón de profesionales no tiene borrado físico: la baja es lógica (suspender).
                .requestMatchers(HttpMethod.DELETE, "/api/especialidades/*", "/api/usuarios/*").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/profesionales").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/profesionales/alta").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/profesionales/*/suspender").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/profesionales/*/reactivar").hasRole("ADMIN")
                // Cualquier rol: es la aceptación de los términos, que se le pide a
                // todo el que entra (cliente, profesional y también el admin).
                .requestMatchers(HttpMethod.PATCH, "/api/terminos/aceptar").authenticated()
                // Suspender va por /api/usuarios/*, que es ADMIN: un cliente
                // desactivado no puede reactivarse a sí mismo.
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/*/suspender").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/*/reactivar").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/usuarios/por-email").hasRole("ADMIN")
                // PROFESIONAL permissions
                .requestMatchers(HttpMethod.PUT, "/api/profesionales/*/disponibilidad").hasRole("PROFESIONAL")
                .requestMatchers(HttpMethod.PATCH, "/api/solicitudes/*/aceptar").hasRole("PROFESIONAL")
                .requestMatchers(HttpMethod.PATCH, "/api/solicitudes/*/rechazar").hasRole("PROFESIONAL")
                // CLIENTE permissions
                .requestMatchers(HttpMethod.POST, "/api/solicitudes").hasRole("CLIENTE")
                // Subida de fotos: la usa cualquier cuenta con sesión, porque
                // cliente, profesional y admin cambian su foto de perfil.
                .requestMatchers(HttpMethod.POST, "/api/fotos").authenticated()
                // Completar y cancelar los puede hacer cualquiera de los dos lados:
                // el profesional que terminó el trabajo o el cliente que lo confirmó.
                .requestMatchers(HttpMethod.PATCH, "/api/solicitudes/*/completar",
                        "/api/solicitudes/*/cancelar").hasAnyRole("CLIENTE", "PROFESIONAL")
                .requestMatchers(HttpMethod.POST, "/api/solicitudes/*/calificacion").hasRole("CLIENTE")
                // Sólo el propio profesional: la reputación se resuelve desde la sesión.
                .requestMatchers(HttpMethod.GET, "/api/mi-reputacion").hasRole("PROFESIONAL")
                // Authenticated permissions
                .requestMatchers(HttpMethod.GET, "/api/solicitudes/mias").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/solicitudes/*/mensajes").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/solicitudes/*/mensajes").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/solicitudes/*/calificacion").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/profesionales/*/disponibilidad").authenticated()
                // Ficha del profesional para la tarjeta de la solicitud del cliente:
                // mismos datos públicos que el listado (nombre, especialidad, foto).
                .requestMatchers(HttpMethod.GET, "/api/profesionales/*").authenticated()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost", "http://localhost:4200", "http://localhost:80",
                "https://vincula-up.local", "http://vincula-up.local",
                "http://127.0.0.1", "http://127.0.0.1:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new Converter<Jwt, Collection<GrantedAuthority>>() {
            @Override
            public Collection<GrantedAuthority> convert(Jwt jwt) {
                List<GrantedAuthority> authorities = new ArrayList<>();
                addClaimRoles(authorities, jwt.getClaimAsStringList("roles"));
                addClaimRoles(authorities, jwt.getClaimAsStringList("realm_access.roles"));
                addClaimRoles(authorities, jwt.getClaimAsStringList("role"));

                Map<String, Object> realmAccess = jwt.getClaim("realm_access");
                if (realmAccess instanceof Map<?, ?> map && map.get("roles") instanceof Collection<?> roles) {
                    for (Object role : roles) {
                        if (role instanceof String value) {
                            authorities.add(new SimpleGrantedAuthority("ROLE_" + value));
                        }
                    }
                }
                return authorities;
            }
        });
        return converter;
    }

    private void addClaimRoles(List<GrantedAuthority> authorities, Collection<String> roles) {
        if (roles == null) {
            return;
        }
        for (String role : roles) {
            if (role != null && !role.isBlank()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            }
        }
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${KEYCLOAK_JWK_SET_URI:http://localhost:8080/realms/vincula-up/protocol/openid-connect/certs}") String jwkSetUri) {
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> validator = token -> {
            String iss = token.getClaimAsString("iss");
            if (iss != null && iss.contains("/realms/vincula-up")) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_issuer", "Issuer " + iss + " is not vincula-up", null));
        };
        jwtDecoder.setJwtValidator(validator);
        return jwtDecoder;
    }

}

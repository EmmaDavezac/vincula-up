package com.vinculaup.bff_web.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
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
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

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
                .requestMatchers("/actuator/health", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/especialidades").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
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
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withJwkSetUri("http://localhost:8080/realms/vincula-up/protocol/openid-connect/certs").build();
    }
}

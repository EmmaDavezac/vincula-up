package com.vinculaup.ms_usuarios.config;

import com.vinculaup.ms_usuarios.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class UsuarioDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(UsuarioDataInitializer.class);

    @Bean
    public CommandLineRunner seedUsuarios(UsuarioRepository repository, JdbcTemplate jdbcTemplate) {
        return args -> {
            relajarKeycloakId(jdbcTemplate);
            ampliarFotoUrl(jdbcTemplate);
            log.info("Usuarios administrados exclusivamente por Keycloak. No se sembraron usuarios demo.");
        };
    }

    /**
     * Las invitaciones de profesionales se guardan con {@code keycloak_id} nulo
     * (la cuenta de Keycloak todavía no existe y se vincula en el primer login).
     * En bases creadas antes de esta funcionalidad la columna quedó {@code NOT NULL},
     * así que la relajamos al arrancar.
     * <p>
     * Es best-effort: si el motor no soporta la sentencia (o ya admite nulos) se
     * registra y el servicio arranca igual, sin dejar el contenedor en un bucle
     * de reinicios.
     */
    private void relajarKeycloakId(JdbcTemplate jdbcTemplate) {
        try {
            jdbcTemplate.execute("ALTER TABLE usuarios ALTER COLUMN keycloak_id DROP NOT NULL");
            log.info("Columna usuarios.keycloak_id admite nulos: invitaciones de profesionales habilitadas.");
        } catch (RuntimeException ex) {
            log.debug("No se pudo relajar usuarios.keycloak_id (probablemente ya admite nulos): {}", ex.getMessage());
        }
    }

    /**
     * La foto de perfil se guarda como data URL (base64): una imagen de 2 MB
     * ocupa ~2,7 MB de texto, muy por encima del {@code varchar(255)} con el que
     * Hibernate creó la columna en bases preexistentes (ddl-auto=update no
     * modifica el tipo de una columna ya creada). La ampliamos a {@code text}
     * al arrancar. Best-effort: en Postgres un ALTER sobre una columna ya
     * {@code text} es un no-op exitoso; si el motor no soporta la sintaxis
     * (H2 crea la tabla nueva por arranque) se registra y el servicio arranca igual.
     */
    private void ampliarFotoUrl(JdbcTemplate jdbcTemplate) {
        try {
            jdbcTemplate.execute("ALTER TABLE usuarios ALTER COLUMN foto_url TYPE text");
            log.info("Columna usuarios.foto_url ampliada a text: fotos de perfil en base64 habilitadas.");
        } catch (RuntimeException ex) {
            log.debug("No se pudo ampliar usuarios.foto_url (probablemente ya es text): {}", ex.getMessage());
        }
    }
}

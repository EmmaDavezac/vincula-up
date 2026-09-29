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
     * La foto ya no se guarda en la base: vive en el almacenamiento de objetos
     * y acá solo queda la URL pública. Una URL corta entra de sobra en
     * {@code varchar(512)}, así que no hace falta ampliar la columna ni ejecutar
     * ningún ALTER al arrancar.
     */
}

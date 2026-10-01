package com.vinculaup.ms_usuarios.config;

import com.vinculaup.ms_usuarios.entity.RolNegocio;
import com.vinculaup.ms_usuarios.entity.Usuario;
import com.vinculaup.ms_usuarios.repository.UsuarioRepository;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class UsuarioDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(UsuarioDataInitializer.class);

    /**
     * Cuentas que crea el realm de Keycloak al importar
     * {@code keycloak/import/vincula-up-realm.json}. Los {@code keycloakId} son los
     * ids fijos del mismo archivo: si el realm se reimporta, quedan iguales y el
     * vínculo sigue funcionando. Si algún día no coincidieran, el primer ingreso
     * re-vincula la cuenta por email (ver {@code UsuarioService}).
     */
    private static final List<UsuarioDemo> CUENTAS_DEMO = List.of(
            new UsuarioDemo("11111111-1111-1111-1111-111111111111", "Sofia", "Gomez",
                    "cliente@vincula-up.local", RolNegocio.CLIENTE),
            new UsuarioDemo("22222222-2222-2222-2222-222222222222", "Luciano", "Benitez",
                    "profesional@vincula-up.local", RolNegocio.PROFESIONAL),
            new UsuarioDemo("33333333-3333-3333-3333-333333333333", "Admin", "Vincula-UP",
                    "admin@vincula-up.local", RolNegocio.ADMIN));

    /** Una de las cuentas de prueba del realm, con su rol de negocio. */
    private record UsuarioDemo(String keycloakId, String nombre, String apellido, String email, RolNegocio rol) {
    }

    @Bean
    public CommandLineRunner seedUsuarios(
            @Value("${sembrar.demo:true}") boolean sembrarDemo,
            UsuarioRepository repository,
            JdbcTemplate jdbcTemplate) {
        return args -> {
            // Primero el esquema: la siembra de profesionales depende de estas filas
            // y necesita el keycloak_id relajado para las invitaciones.
            relajarKeycloakId(jdbcTemplate);
            if (!sembrarDemo) {
                log.info("SEMBRAR_DEMO=false: no se siembran las cuentas de prueba.");
                return;
            }
            sembrarCuentas(repository);
        };
    }

    /**
     * Siembra las cuentas de prueba con su rol de negocio.
     * <p>
     * <b>Por qué hace falta.</b> El rol de negocio que ve la aplicación sale de
     * esta tabla, no del token: si la fila no existe, el primer ingreso la crea
     * sola. Sembrarlas deja el padrón, el panel y las solicitudes de demo
     * funcionando desde el primer arranque, sin depender de que alguien haya
     * entrado antes con cada cuenta.
     * <p>
     * Idempotente por email y por {@code keycloakId}: si la cuenta ya existe (la
     * creó un ingreso previo) no se toca, así que una base con datos reales no se
     * pisa. El {@code id} lo genera la base, porque no hay un UUID fijo que
     * hardcodear y los tres microservicios comparten la base.
     * <p>
     * Cada cuenta va en su propio try/catch: {@code keycloak_id} es único y un
     * choque en una no debe tirar abajo las otras dos. Es best-effort, igual que
     * los otros inicializadores: un fallo de siembra no debe tumbar el arranque.
     */
    private void sembrarCuentas(UsuarioRepository repository) {
        int sembradas = 0;
        for (UsuarioDemo cuenta : CUENTAS_DEMO) {
            try {
                UUID keycloakId = UUID.fromString(cuenta.keycloakId());
                if (repository.findByEmailIgnoreCase(cuenta.email()).isPresent()
                        || repository.findByKeycloakId(keycloakId).isPresent()) {
                    log.debug("La cuenta {} ya existe; no se siembra.", cuenta.email());
                    continue;
                }
                repository.save(new Usuario(keycloakId, cuenta.nombre(), cuenta.apellido(),
                        cuenta.email(), "", cuenta.rol()));
                sembradas++;
                log.info("Cuenta de prueba sembrada: {} con rol {}", cuenta.email(), cuenta.rol());
            } catch (RuntimeException ex) {
                log.warn("No se pudo sembrar la cuenta {} (el servicio arranca igual): {}",
                        cuenta.email(), ex.getMessage());
            }
        }
        if (sembradas == 0) {
            log.info("Las cuentas de prueba ya estaban cargadas; no se siembra nada nuevo.");
        }
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
}

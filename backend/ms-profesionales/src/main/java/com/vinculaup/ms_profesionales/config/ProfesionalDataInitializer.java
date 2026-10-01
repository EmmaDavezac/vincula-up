package com.vinculaup.ms_profesionales.config;

import com.vinculaup.ms_profesionales.entity.DiaSemana;
import com.vinculaup.ms_profesionales.entity.Disponibilidad;
import com.vinculaup.ms_profesionales.entity.Especialidad;
import com.vinculaup.ms_profesionales.entity.Profesional;
import com.vinculaup.ms_profesionales.repository.DisponibilidadRepository;
import com.vinculaup.ms_profesionales.repository.EspecialidadRepository;
import com.vinculaup.ms_profesionales.repository.ProfesionalRepository;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class ProfesionalDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(ProfesionalDataInitializer.class);

    /**
     * Siembra el padrón de demo.
     * <p>
     * Solo corre con {@code SEMBRAR_DEMO=true} (por defecto). Con la bandera en
     * false la base queda vacía: ni especialidades, ni profesionales, ni
     * disponibilidad. Las especialidades las necesita la aplicación para
     * funcionar (el alta de un profesional las elige de una lista), así que en
     * una base vacía hay que crearlas desde el panel de administración.
     * <p>
     * La siembra es best-effort: nunca debe tumbar el arranque del microservicio. Un fallo
     * de seed (por ejemplo una base ya sembrada por una versión anterior del inicializador
     * con identificadores fijos) dejaría el contenedor en un bucle de reinicios y todas las
     * llamadas del BFF/nginx responderían 502. Si algo falla se registra y se sigue: los
     * perfiles se crean y activan bajo demanda desde {@code /profesionales/activar}.
     */
    /** Cuenta de prueba del realm de Keycloak: el profesional de la demo. */
    private static final String EMAIL_PROFESIONAL = "profesional@vincula-up.local";

    /**
     * Id de Keycloak de esa misma cuenta ({@code keycloak/import/vincula-up-realm.json}).
     * Se usa solo como respaldo cuando {@code ms-usuarios} todavía no tiene la fila:
     * {@code ms-profesionales} no depende de ese servicio y puede arrancar antes.
     */
    private static final String KEYCLOAK_ID_PROFESIONAL = "22222222-2222-2222-2222-222222222222";

    @Bean
    public CommandLineRunner seedProfesionales(
            @org.springframework.beans.factory.annotation.Value("${sembrar.demo:true}") boolean sembrarDemo,
            org.springframework.transaction.support.TransactionTemplate transactionTemplate,
            jakarta.persistence.EntityManager entityManager,
            JdbcTemplate jdbcTemplate,
            EspecialidadRepository especialidadRepo,
            ProfesionalRepository profesionalRepo,
            DisponibilidadRepository disponibilidadRepo) {
        return args -> {
            if (!sembrarDemo) {
                log.info("SEMBRAR_DEMO=false: no se siembra el padrón de demo.");
                return;
            }
            try {
                transactionTemplate.executeWithoutResult(
                        status -> seed(entityManager, jdbcTemplate, especialidadRepo, profesionalRepo, disponibilidadRepo));
            } catch (RuntimeException ex) {
                log.warn("No se pudo sembrar el padrón de profesionales de demo (el servicio arranca igual): {}",
                        ex.getMessage(), ex);
            }
        };
    }

    /**
     * La foto del perfil profesional ya no se guarda en la base: vive en el
     * almacenamiento de objetos y acá solo queda la URL pública, que entra de
     * sobra en una columna corta. No hace falta ningún ALTER al arrancar.
     */

    private void seed(
            jakarta.persistence.EntityManager entityManager,
            JdbcTemplate jdbcTemplate,
            EspecialidadRepository especialidadRepo,
            ProfesionalRepository profesionalRepo,
            DisponibilidadRepository disponibilidadRepo) {
        Especialidad elec = seedEspecialidad(entityManager, especialidadRepo, "Electricidad domiciliaria",
                UUID.fromString("33333333-3333-3333-3333-333333333333"));
        seedEspecialidad(entityManager, especialidadRepo, "Plomería y gas",
                UUID.fromString("66666666-6666-6666-6666-666666666666"));
        seedEspecialidad(entityManager, especialidadRepo, "Refrigeración y aire",
                UUID.fromString("99999999-9999-9999-9999-999999999999"));
        seedEspecialidad(entityManager, especialidadRepo, "Reparación de electrodomésticos",
                UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"));
        seedEspecialidad(entityManager, especialidadRepo, "Pintura y albañilería",
                UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"));
        seedEspecialidad(entityManager, especialidadRepo, "Cerrajería integral",
                UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"));

        // El usuarioId del padrón es el id de ms-usuarios. Antes se sembraba con el
        // keycloakId de Luciano, que no es el mismo: el perfil quedaba apuntando a
        // un usuario inexistente y dependía de que el BFF lo corrigiera después
        // con POST /profesionales/vincular. Ahora se resuelve por email (los tres
        // microservicios comparten base) y el respaldo sigue siendo el keycloakId,
        // por si este servicio arranca antes que ms-usuarios.
        UUID lucianoUsuarioId = usuarioPorEmail(jdbcTemplate, EMAIL_PROFESIONAL);
        if (lucianoUsuarioId == null) {
            lucianoUsuarioId = UUID.fromString(KEYCLOAK_ID_PROFESIONAL);
            log.info("La cuenta {} todavía no está en ms-usuarios: el perfil de demo se siembra "
                    + "con su keycloakId y se reasocia al primer ingreso.", EMAIL_PROFESIONAL);
        }
        // Idempotencia: si el padrón ya existe (o lo sembró una versión previa con otro
        // usuario/identidad) no se vuelve a insertar ni se toca.
        if (profesionalRepo.existsByUsuarioId(lucianoUsuarioId)
                || profesionalRepo.existsByLegajoIgnoreCase("P-2001")) {
            log.debug("El padrón de profesionales de demo ya estaba sembrado; no se modifica.");
            return;
        }

        Set<Especialidad> especialidades = new HashSet<>();
        if (elec != null) {
            especialidades.add(elec);
        }
        Profesional luciano = new Profesional(lucianoUsuarioId, "P-2001", especialidades);
        // Sin foto: el perfil se muestra con iniciales. Antes apuntaba al SVG de
        // demo (frontend/vincula-up-web/public/demo-luciano-benitez.svg), que
        // nginx servía como estático. Las fotos de perfil ahora se leen por el
        // BFF (GET /api/usuarios/{id}/foto) y no salen del volumen, así que un
        // asset del frontend ya no llega: el avatar cae a iniciales y listo.
        luciano.activar(
                null,
                -32.4844, -58.2328, 20.0
        );
        luciano = profesionalRepo.save(luciano);
        log.info("Profesional sembrado y activado: {} con legajo {}", luciano.getId(), luciano.getLegajo());

        UUID profId = luciano.getId();
        if (!disponibilidadRepo.findByProfesionalId(profId).isEmpty()) {
            return;
        }
        for (DiaSemana dia : List.of(DiaSemana.LUNES, DiaSemana.MARTES, DiaSemana.MIERCOLES, DiaSemana.JUEVES, DiaSemana.VIERNES, DiaSemana.SABADO)) {
            disponibilidadRepo.save(new Disponibilidad(profId, dia, LocalTime.of(8, 0), LocalTime.of(20, 0)));
        }
        log.info("Disponibilidad semanal configurada para profesional {}", profId);
    }

    /**
     * Id de {@code ms-usuarios} del correo dado, o {@code null} si la cuenta
     * todavía no existe (nadie entró con ella). Se resuelve por SQL directo
     * porque este servicio no depende de {@code ms-usuarios}: los tres
     * microservicios comparten la misma base.
     */
    private UUID usuarioPorEmail(JdbcTemplate jdbcTemplate, String email) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT id FROM usuarios WHERE email = ?", (rs, row) -> rs.getObject(1, UUID.class), email);
        } catch (org.springframework.dao.EmptyResultDataAccessException sinCuenta) {
            return null;
        }
    }

    private Especialidad seedEspecialidad(jakarta.persistence.EntityManager entityManager, EspecialidadRepository repository, String nombre, UUID fixedId) {
        return repository.findById(fixedId).orElseGet(() ->
                repository.findAll().stream()
                        .filter(e -> e.getNombre().equalsIgnoreCase(nombre))
                        .findFirst()
                        .orElseGet(() -> {
                            entityManager.createNativeQuery("INSERT INTO especialidades (id, nombre) VALUES (?, ?)")
                                    .setParameter(1, fixedId)
                                    .setParameter(2, nombre)
                                    .executeUpdate();
                            log.info("Especialidad sembrada: {} (ID={})", nombre, fixedId);
                            return repository.findById(fixedId).orElseThrow();
                        }));
    }
}

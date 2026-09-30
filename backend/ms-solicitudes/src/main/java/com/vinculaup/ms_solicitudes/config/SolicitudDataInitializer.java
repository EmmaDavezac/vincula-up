package com.vinculaup.ms_solicitudes.config;

import com.vinculaup.ms_solicitudes.entity.Calificacion;
import com.vinculaup.ms_solicitudes.entity.EstadoSolicitud;
import com.vinculaup.ms_solicitudes.entity.Mensaje;
import com.vinculaup.ms_solicitudes.entity.Solicitud;
import com.vinculaup.ms_solicitudes.repository.CalificacionRepository;
import com.vinculaup.ms_solicitudes.repository.MensajeRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration
public class SolicitudDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(SolicitudDataInitializer.class);

    /** Cuentas de prueba que crea el realm de Keycloak al importar. */
    private static final String EMAIL_CLIENTE = "cliente@vincula-up.local";
    private static final String EMAIL_PROFESIONAL = "profesional@vincula-up.local";

    /**
     * Siembra solicitudes de demo para que los listados no se vean vacíos.
     * <p>
     * Solo corre con {@code SEMBRAR_DEMO=true}. Cubre los cuatro estados del
     * ciclo: se ve el panel del profesional (una por aceptar), el chat (una
     * aceptada), la reputación con estrellas (una completada y calificada) y el
     * motivo de rechazo.
     * <p>
     * <b>Los usuarios se resuelven por email, no por id fijo.</b> Las cuentas las
     * crea Keycloak al importar el realm y los ids los genera la base, así que
     * no hay un UUID que hardcodear. Los tres microservicios comparten la misma
     * base, así que se leen por SQL directo en lugar de abrir un cliente HTTP
     * contra ms-usuarios.
     * <p>
     * Si las cuentas todavía no existen —la primera vez que se levanta el stack
     * nadie ha iniciado sesión, y la fila en {@code usuarios} recién aparece en
     * el primer login— la siembra se omite con un aviso. Basta con que alguien
     * entre una vez con cada cuenta y reiniciar el servicio.
     * <p>
     * Es best-effort por lo mismo que el resto de los inicializadores: un fallo
     * no debe dejar el contenedor reiniciándose en loop.
     */
    @Bean
    public CommandLineRunner seedSolicitudes(
            @Value("${sembrar.demo:true}") boolean sembrarDemo,
            TransactionTemplate transactionTemplate,
            JdbcTemplate jdbcTemplate,
            SolicitudRepository solicitudRepo,
            MensajeRepository mensajeRepo,
            CalificacionRepository calificacionRepo) {
        return args -> {
            if (!sembrarDemo) {
                log.info("SEMBRAR_DEMO=false: no se siembran solicitudes de demo.");
                return;
            }
            try {
                transactionTemplate.executeWithoutResult(status -> {
                    seed(jdbcTemplate, solicitudRepo, mensajeRepo, calificacionRepo);
                });
            } catch (RuntimeException ex) {
                log.warn("No se pudieron sembrar las solicitudes de demo (el servicio arranca igual): {}",
                        ex.getMessage(), ex);
            }
        };
    }
    private void seed(
            JdbcTemplate jdbcTemplate,
            SolicitudRepository solicitudRepo,
            MensajeRepository mensajeRepo,
            CalificacionRepository calificacionRepo) {
        if (!solicitudRepo.findAll().isEmpty()) {
            log.debug("Ya hay solicitudes cargadas; no se siembra nada nuevo.");
            return;
        }

        UUID clienteId = usuarioPorEmail(jdbcTemplate, EMAIL_CLIENTE);
        UUID profesionalUsuarioId = usuarioPorEmail(jdbcTemplate, EMAIL_PROFESIONAL);
        UUID profesionalId = profesionalPorUsuario(jdbcTemplate, profesionalUsuarioId);

        if (clienteId == null || profesionalId == null) {
            log.info("No se siembran solicitudes: falta la cuenta de {} o {}. Iniciá sesión "
                    + "con las cuentas de prueba y reiniciá ms-solicitudes.", EMAIL_CLIENTE, EMAIL_PROFESIONAL);
            return;
        }

        UUID electricidad = UUID.fromString("33333333-3333-3333-3333-333333333333");
        LocalDateTime ahora = LocalDateTime.now();

        // 1) Pendiente: el profesional tiene trabajo por aceptar.
        Solicitud pendiente = solicitudRepo.save(solicitud(
                clienteId, profesionalId, electricidad,
                "25 de Mayo 1234, Concepcion del Uruguay", "Centro",
                "No me enciende la luz de la cocina. Cambie la lampara y sigue igual.",
                ahora.plusDays(1), ahora.plusDays(1).plusHours(3)));

        // 2) Aceptada: se ve el chat y la direccion revelada al profesional.
        Solicitud aceptada = solicitudRepo.save(solicitud(
                clienteId, profesionalId, electricidad,
                "9 de Julio 751, Concepcion del Uruguay", "Centro",
                "Se me corta la luz cuando prendo el aire y el horno a la vez.",
                ahora.plusDays(2), ahora.plusDays(2).plusHours(2)));
        aceptada.cambiarEstado(EstadoSolicitud.ACEPTADA);
        solicitudRepo.save(aceptada);
        mensajeRepo.save(new Mensaje(aceptada.getId(), clienteId,
                "Hola, podes pasar manana a la manana? La luz vuelve a las dudas."));
        mensajeRepo.save(new Mensaje(aceptada.getId(), profesionalId,
                "Si, manana a las 10 te sirve. Llego con un tester para ver de donde viene el corte."));

        // 3) Completada y calificada: da estrellas reales al profesional.
        Solicitud completada = solicitudRepo.save(solicitud(
                clienteId, profesionalId, electricidad,
                "Sarandi 456, Concepcion del Uruguay", "Centro",
                "Quiero revisar la instalacion electrica de la casa antes de winter.",
                ahora.minusDays(3), ahora.minusDays(3).plusHours(2)));
        completada.cambiarEstado(EstadoSolicitud.ACEPTADA);
        completada.cambiarEstado(EstadoSolicitud.COMPLETADA);
        solicitudRepo.save(completada);
        calificacionRepo.save(new Calificacion(completada.getId(), 5,
                "Puntual y muy claro. Me explico que podia fallar y como prevenirlo."));

        // 4) Rechazada: se ve el motivo que lee el cliente.
        Solicitud rechazada = solicitudRepo.save(solicitud(
                clienteId, profesionalId, electricidad,
                "Urquiola 789, Concepcion del Uruguay", "Barrio Norte",
                "Necesito un certificado para la instalacion de un kiosco.",
                ahora.plusDays(4), ahora.plusDays(4).plusHours(1)));
        rechazada.rechazar("Ese tramite requiere matricula habilitada; te paso el contacto de un colega.");
        solicitudRepo.save(rechazada);

        log.info("Solicitudes de demo sembradas: 1 pendiente, 1 aceptada, 1 completada y "
                + "1 rechazada, con mensajes y una calificacion.");
    }

    private Solicitud solicitud(
            UUID clienteId,
            UUID profesionalId,
            UUID especialidadId,
            String direccion,
            String zona,
            String descripcion,
            LocalDateTime inicio,
            LocalDateTime fin) {
        return new Solicitud(clienteId, profesionalId, especialidadId, direccion, zona,
                -32.4833, -58.2318, inicio, descripcion, fin);
    }

    /** Id de ms-usuarios del correo dado, o null si la cuenta todavia no existe. */
    private UUID usuarioPorEmail(JdbcTemplate jdbcTemplate, String email) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT id FROM usuarios WHERE email = ?", (rs, row) -> rs.getObject(1, UUID.class), email);
        } catch (org.springframework.dao.EmptyResultDataAccessException sinCuenta) {
            return null;
        }
    }

    /** Perfil profesional asociado a ese usuario, o null si aun no se activo. */
    private UUID profesionalPorUsuario(JdbcTemplate jdbcTemplate, UUID usuarioId) {
        if (usuarioId == null) {
            return null;
        }
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT id FROM profesionales WHERE usuario_id = ?",
                    (rs, row) -> rs.getObject(1, UUID.class), usuarioId);
        } catch (org.springframework.dao.EmptyResultDataAccessException sinPerfil) {
            return null;
        }
    }
}


package com.vinculaup.ms_solicitudes.config;

import com.vinculaup.ms_solicitudes.repository.MensajeRepository;
import com.vinculaup.ms_solicitudes.repository.SolicitudRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SolicitudDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(SolicitudDataInitializer.class);

    @Bean
    public CommandLineRunner seedSolicitudes(SolicitudRepository solicitudRepo, MensajeRepository mensajeRepo) {
        return args -> {
            log.info("No se sembraron solicitudes demo. Solo se usan solicitudes reales creadas por usuarios de Keycloak.");
        };
    }
}

package com.vinculaup.ms_usuarios.config;

import com.vinculaup.ms_usuarios.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UsuarioDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(UsuarioDataInitializer.class);

    @Bean
    public CommandLineRunner seedUsuarios(UsuarioRepository repository) {
        return args -> {
            log.info("Usuarios administrados exclusivamente por Keycloak. No se sembraron usuarios demo.");
        };
    }
}

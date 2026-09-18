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

@Configuration
public class ProfesionalDataInitializer {

    private static final Logger log = LoggerFactory.getLogger(ProfesionalDataInitializer.class);

    @Bean
    public CommandLineRunner seedProfesionales(
            org.springframework.transaction.support.TransactionTemplate transactionTemplate,
            jakarta.persistence.EntityManager entityManager,
            EspecialidadRepository especialidadRepo,
            ProfesionalRepository profesionalRepo,
            DisponibilidadRepository disponibilidadRepo) {
        return args -> transactionTemplate.executeWithoutResult(status -> {
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

            UUID lucianoUsuarioId = UUID.fromString("22222222-2222-2222-2222-222222222222");
            if (profesionalRepo.findByUsuarioId(lucianoUsuarioId).isEmpty()
                    && !profesionalRepo.existsByLegajoIgnoreCase("P-2001")) {
                Set<Especialidad> especialidades = new HashSet<>();
                if (elec != null) {
                    especialidades.add(elec);
                }
                Profesional luciano = new Profesional(lucianoUsuarioId, "P-2001", especialidades);
                luciano.activar(
                        "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200",
                        -32.4844, -58.2328, 20.0
                );
                luciano = profesionalRepo.save(luciano);
                log.info("Profesional sembrado y activado: {} con legajo {}", luciano.getId(), luciano.getLegajo());

                UUID profId = luciano.getId();
                for (DiaSemana dia : List.of(DiaSemana.LUNES, DiaSemana.MARTES, DiaSemana.MIERCOLES, DiaSemana.JUEVES, DiaSemana.VIERNES, DiaSemana.SABADO)) {
                    disponibilidadRepo.save(new Disponibilidad(profId, dia, LocalTime.of(8, 0), LocalTime.of(20, 0)));
                }
                log.info("Disponibilidad semanal configurada para profesional {}", profId);
            }
        });
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

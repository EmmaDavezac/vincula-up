package com.vinculaup.ms_usuarios.repository;

import com.vinculaup.ms_usuarios.entity.SuscripcionPush;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SuscripcionPushRepository extends JpaRepository<SuscripcionPush, UUID> {
    Optional<SuscripcionPush> findByEndpoint(String endpoint);
    List<SuscripcionPush> findByUsuarioId(UUID usuarioId);
    void deleteByUsuarioIdAndEndpoint(UUID usuarioId, String endpoint);
}
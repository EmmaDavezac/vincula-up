package com.vinculaup.ms_usuarios.repository;

import com.vinculaup.ms_usuarios.entity.Usuario;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByKeycloakId(UUID keycloakId);
    boolean existsByEmailIgnoreCase(String email);
}

package com.vinculaup.ms_usuarios.repository;

import com.vinculaup.ms_usuarios.entity.EstadoUsuario;
import com.vinculaup.ms_usuarios.entity.Usuario;
import com.vinculaup.ms_usuarios.entity.RolNegocio;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByKeycloakId(UUID keycloakId);
    Optional<Usuario> findByEmailIgnoreCase(String email);
    List<Usuario> findByRolNegocio(RolNegocio rolNegocio);
    List<Usuario> findByRolNegocioAndEstado(RolNegocio rolNegocio, EstadoUsuario estado);
    boolean existsByEmailIgnoreCase(String email);
}

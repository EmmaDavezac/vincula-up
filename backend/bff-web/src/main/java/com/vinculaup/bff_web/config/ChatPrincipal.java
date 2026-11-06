package com.vinculaup.bff_web.config;

import java.security.Principal;
import java.util.UUID;

public record ChatPrincipal(UUID usuarioId, UUID keycloakId, String role, String authorization) implements Principal {

    @Override
    public String getName() {
        return keycloakId.toString();
    }
}
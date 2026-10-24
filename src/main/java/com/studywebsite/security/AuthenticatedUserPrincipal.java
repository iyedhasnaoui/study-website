package com.studywebsite.security;

import java.util.Set;

/**
 * The caller as the application sees them: their Keycloak identity joined to the local user row
 * that owns their content.
 */
public record AuthenticatedUserPrincipal(
        String keycloakId,
        Long userId,
        String username,
        String email,
        AppRole role,
        Set<String> roles
) {
    public boolean isAdmin() {
        return role == AppRole.ADMIN;
    }

    public boolean canContribute() {
        return role == AppRole.ADMIN || role == AppRole.CONTRIBUTOR;
    }
}

package com.studywebsite.security;

import java.util.Collection;

/**
 * The three application roles, held as Keycloak realm roles. Every account has exactly one:
 * a token carrying none of them is treated as a VIEWER.
 */
public enum AppRole {
    VIEWER,
    CONTRIBUTOR,
    ADMIN;

    public static final String ROLE_PREFIX = "ROLE_";

    public String authority() {
        return ROLE_PREFIX + name();
    }

    /** The strongest role present, so a mis-provisioned account can never gain by holding several. */
    public static AppRole highestOf(Collection<String> realmRoles) {
        if (realmRoles == null) return VIEWER;
        if (realmRoles.contains(ADMIN.name())) return ADMIN;
        if (realmRoles.contains(CONTRIBUTOR.name())) return CONTRIBUTOR;
        return VIEWER;
    }

    public static boolean isAssignableByAdmin(AppRole role) {
        return role == VIEWER || role == CONTRIBUTOR;
    }
}

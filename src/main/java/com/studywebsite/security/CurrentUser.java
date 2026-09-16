package com.studywebsite.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static Optional<AuthenticatedUserPrincipal> find() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUserPrincipal principal)) {
            return Optional.empty();
        }
        return Optional.of(principal);
    }

    public static AuthenticatedUserPrincipal require() {
        return find().orElseThrow(() -> new UnauthenticatedException("Sign in to perform this action"));
    }
}

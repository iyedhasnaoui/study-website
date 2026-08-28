package com.studywebsite.security;

import java.util.Set;

public record AuthenticatedUserPrincipal(
        Long sessionId,
        Long userId,
        String email,
        Set<String> roles
) {
}

package com.studywebsite.dto.auth;

import java.time.LocalDateTime;
import java.util.Set;

public record AuthenticatedUserResponse(
        Long id,
        String email,
        Set<String> roles,
        LocalDateTime joinedAt
) {
}

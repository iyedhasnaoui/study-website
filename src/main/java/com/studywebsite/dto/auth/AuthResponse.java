package com.studywebsite.dto.auth;

import java.time.Instant;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Instant expiresAt,
        AuthenticatedUserResponse user
) {
}

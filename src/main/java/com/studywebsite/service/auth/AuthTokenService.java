package com.studywebsite.service.auth;

import com.studywebsite.model.AuthSession;
import com.studywebsite.model.User;
import com.studywebsite.repository.AuthSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthTokenService {

    private static final int TOKEN_BYTES = 32;

    private final AuthSessionRepository authSessionRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Duration tokenLifetime;

    public AuthTokenService(
            AuthSessionRepository authSessionRepository,
            @Value("${app.auth.token-ttl-hours:24}") long tokenTtlHours
    ) {
        this.authSessionRepository = authSessionRepository;
        this.tokenLifetime = Duration.ofHours(tokenTtlHours);
    }

    @Transactional
    public IssuedToken issueAuthentication(User user) {
        byte[] tokenBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(tokenBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        Instant expiresAt = Instant.now().plus(tokenLifetime);

        AuthSession session = AuthSession.builder()
                .tokenHash(hash(rawToken))
                .user(user)
                .expiresAt(expiresAt)
                .build();

        AuthSession savedSession = authSessionRepository.save(session);
        return new IssuedToken(rawToken, expiresAt, savedSession.getId());
    }

    @Transactional
    public Optional<AuthenticatedSession> authenticate(String rawToken) {
        return authSessionRepository.findByTokenHash(hash(rawToken))
                .flatMap(session -> {
                    if (!session.getExpiresAt().isAfter(Instant.now())) {
                        authSessionRepository.delete(session);
                        return Optional.empty();
                    }

                    User user = session.getUser();
                    Set<String> roles = user.getUserRoles().stream()
                            .map(role -> role.getRole())
                            .collect(Collectors.toUnmodifiableSet());

                    return Optional.of(new AuthenticatedSession(
                            session.getId(),
                            user.getId(),
                            user.getUsername(),
                            user.getEmail(),
                            roles
                    ));
                });
    }

    @Transactional
    public void invalidateAuthentication(Long sessionId) {
        authSessionRepository.deleteById(sessionId);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    public record IssuedToken(String value, Instant expiresAt, Long sessionId) {
    }

    public record AuthenticatedSession(
            Long sessionId,
            Long userId,
            String username,
            String email,
            Set<String> roles
    ) {
    }
}

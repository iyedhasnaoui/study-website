package com.studywebsite.security;

import com.studywebsite.model.User;
import com.studywebsite.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Keycloak owns identity, but content is linked to local user rows. The first time an account
 * appears with a valid token it gets a row here, keyed by its Keycloak subject.
 */
@Service
@RequiredArgsConstructor
public class LocalUserProvisioningService {

    private final UserRepository userRepository;

    @Transactional
    public User resolve(Jwt jwt) {
        String keycloakId = jwt.getSubject();
        String username = claim(jwt, "preferred_username", keycloakId);
        String email = claim(jwt, "email", username + "@users.noreply.local");

        Optional<User> byKeycloakId = userRepository.findByKeycloakId(keycloakId);
        if (byKeycloakId.isPresent()) {
            return refresh(byKeycloakId.get(), username, email);
        }

        // Accounts that predate Keycloak are adopted by e-mail rather than duplicated.
        Optional<User> byEmail = userRepository.findByEmailIgnoreCase(email);
        if (byEmail.isPresent()) {
            User existing = byEmail.get();
            existing.setKeycloakId(keycloakId);
            return refresh(existing, username, email);
        }

        User user = new User();
        user.setKeycloakId(keycloakId);
        user.setUsername(uniqueUsername(username));
        user.setEmail(email);
        user.setPasswordHash("external");
        user.setJoinedAt(LocalDateTime.now());
        user.setBanned(false);
        return userRepository.save(user);
    }

    private User refresh(User user, String username, String email) {
        if (!email.equalsIgnoreCase(user.getEmail())
                && userRepository.findByEmailIgnoreCase(email).isEmpty()) {
            user.setEmail(email);
        }
        if (!username.equals(user.getUsername())
                && userRepository.findByUsernameIgnoreCase(username).isEmpty()) {
            user.setUsername(username);
        }
        return userRepository.save(user);
    }

    private String uniqueUsername(String preferred) {
        if (userRepository.findByUsernameIgnoreCase(preferred).isEmpty()) return preferred;
        for (int suffix = 2; suffix < 1000; suffix++) {
            String candidate = preferred + "-" + suffix;
            if (userRepository.findByUsernameIgnoreCase(candidate).isEmpty()) return candidate;
        }
        throw new IllegalStateException("Could not derive a free username for " + preferred);
    }

    private String claim(Jwt jwt, String name, String fallback) {
        Object value = jwt.getClaims().get(name);
        return value == null || String.valueOf(value).isBlank() ? fallback : String.valueOf(value);
    }
}

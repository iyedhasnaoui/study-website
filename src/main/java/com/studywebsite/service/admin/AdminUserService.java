package com.studywebsite.service.admin;

import com.studywebsite.model.User;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.security.AppRole;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * User administration. ADMIN is fixed at deployment: this service refuses to grant it, to take it
 * away, or to touch an account that already holds it — including the caller's own.
 */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final KeycloakAdminClient keycloak;
    private final UserRepository userRepository;

    public record ManagedUser(
            String keycloakId,
            Long localUserId,
            String username,
            String email,
            AppRole role,
            boolean enabled,
            boolean banned,
            int activeSessions,
            boolean protectedAccount
    ) {
    }

    public List<ManagedUser> listUsers() {
        Map<String, User> localByKeycloakId = userRepository.findAll().stream()
                .filter(user -> user.getKeycloakId() != null)
                .collect(Collectors.toMap(User::getKeycloakId, Function.identity(), (a, b) -> a));

        return keycloak.listUsers().stream()
                .map(account -> {
                    User local = localByKeycloakId.get(account.id());
                    return new ManagedUser(
                            account.id(),
                            local == null ? null : local.getId(),
                            account.username(),
                            account.email(),
                            account.role(),
                            account.enabled(),
                            local != null && Boolean.TRUE.equals(local.getBanned()),
                            keycloak.countSessions(account.id()),
                            account.role() == AppRole.ADMIN
                    );
                })
                .sorted((a, b) -> a.username().compareToIgnoreCase(b.username()))
                .toList();
    }

    @Transactional
    public void changeRole(String keycloakId, AppRole requested) {
        if (!AppRole.isAssignableByAdmin(requested)) {
            throw new ProtectedRoleException("ADMIN is assigned at deployment and cannot be granted through the app");
        }
        assertNotAdmin(keycloakId);

        keycloak.replaceRole(keycloakId, requested);
        // A demoted account keeps its old role inside already-issued tokens until they expire.
        keycloak.endSessions(keycloakId);
    }

    @Transactional
    public void removeUser(String keycloakId) {
        assertNotAdmin(keycloakId);

        keycloak.endSessions(keycloakId);
        keycloak.deleteUser(keycloakId);
        userRepository.findByKeycloakId(keycloakId).ifPresent(user -> {
            user.setBanned(true);
            user.setKeycloakId(null);
            userRepository.save(user);
        });
    }

    @Transactional
    public void setBanned(String keycloakId, boolean banned) {
        assertNotAdmin(keycloakId);

        keycloak.setEnabled(keycloakId, !banned);
        if (banned) {
            keycloak.endSessions(keycloakId);
        }
        userRepository.findByKeycloakId(keycloakId).ifPresent(user -> {
            user.setBanned(banned);
            userRepository.save(user);
        });
    }

    public void endSessions(String keycloakId) {
        requireUser(keycloakId);
        keycloak.endSessions(keycloakId);
    }

    private void assertNotAdmin(String keycloakId) {
        requireUser(keycloakId);
        if (keycloak.roleOf(keycloakId) == AppRole.ADMIN) {
            throw new ProtectedRoleException("Administrator accounts are managed at deployment and cannot be changed here");
        }
    }

    private void requireUser(String keycloakId) {
        Optional<KeycloakAdminClient.KeycloakUser> account = keycloak.findUser(keycloakId);
        if (account.isEmpty()) {
            throw new EntityNotFoundException("No such user: " + keycloakId);
        }
    }
}

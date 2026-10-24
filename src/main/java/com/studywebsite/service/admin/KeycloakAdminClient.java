package com.studywebsite.service.admin;

import com.studywebsite.security.AppRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Talks to the Keycloak Admin REST API with the backend's service account. Keycloak owns roles,
 * so every role change goes through here rather than through a local table.
 */
@Component
public class KeycloakAdminClient {

    private final RestClient restClient;
    private final String realm;
    private final String clientId;
    private final String clientSecret;

    private String cachedToken;
    private Instant cachedTokenExpiry = Instant.EPOCH;

    public KeycloakAdminClient(
            @Value("${app.keycloak.base-url}") String baseUrl,
            @Value("${app.keycloak.realm}") String realm,
            @Value("${app.keycloak.admin-client-id}") String clientId,
            @Value("${app.keycloak.admin-client-secret}") String clientSecret
    ) {
        this.restClient = RestClient.create(baseUrl);
        this.realm = realm;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public record KeycloakUser(String id, String username, String email, boolean enabled, AppRole role) {
    }

    public List<KeycloakUser> listUsers() {
        List<Map<String, Object>> raw = restClient.get()
                .uri("/admin/realms/{realm}/users?max=500&briefRepresentation=true", realm)
                .header("Authorization", "Bearer " + token())
                .retrieve()
                .body(List.class);

        List<KeycloakUser> users = new ArrayList<>();
        for (Map<String, Object> entry : raw == null ? List.<Map<String, Object>>of() : raw) {
            String id = String.valueOf(entry.get("id"));
            users.add(new KeycloakUser(
                    id,
                    str(entry.get("username")),
                    str(entry.get("email")),
                    !Boolean.FALSE.equals(entry.get("enabled")),
                    AppRole.highestOf(realmRoleNames(id))
            ));
        }
        return users;
    }

    public Optional<KeycloakUser> findUser(String userId) {
        return listUsers().stream().filter(user -> user.id().equals(userId)).findFirst();
    }

    public AppRole roleOf(String userId) {
        return AppRole.highestOf(realmRoleNames(userId));
    }

    /** Replaces a user's application role, leaving Keycloak's built-in roles untouched. */
    public void replaceRole(String userId, AppRole next) {
        List<Map<String, Object>> assigned = realmRoleMappings(userId);

        List<Map<String, Object>> toRemove = assigned.stream()
                .filter(role -> isApplicationRole(str(role.get("name"))))
                .filter(role -> !next.name().equals(str(role.get("name"))))
                .toList();

        if (!toRemove.isEmpty()) {
            restClient.method(org.springframework.http.HttpMethod.DELETE)
                    .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, userId)
                    .header("Authorization", "Bearer " + token())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(toRemove)
                    .retrieve()
                    .toBodilessEntity();
        }

        boolean alreadyHasIt = assigned.stream().anyMatch(role -> next.name().equals(str(role.get("name"))));
        if (!alreadyHasIt) {
            restClient.post()
                    .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, userId)
                    .header("Authorization", "Bearer " + token())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of(realmRole(next.name())))
                    .retrieve()
                    .toBodilessEntity();
        }
    }

    public void deleteUser(String userId) {
        restClient.delete()
                .uri("/admin/realms/{realm}/users/{id}", realm, userId)
                .header("Authorization", "Bearer " + token())
                .retrieve()
                .toBodilessEntity();
    }

    public void setEnabled(String userId, boolean enabled) {
        restClient.put()
                .uri("/admin/realms/{realm}/users/{id}", realm, userId)
                .header("Authorization", "Bearer " + token())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("enabled", enabled))
                .retrieve()
                .toBodilessEntity();
    }

    /** Ends every session the user has, so a revoked role or a ban takes effect immediately. */
    public void endSessions(String userId) {
        restClient.post()
                .uri("/admin/realms/{realm}/users/{id}/logout", realm, userId)
                .header("Authorization", "Bearer " + token())
                .retrieve()
                .toBodilessEntity();
    }

    public int countSessions(String userId) {
        List<?> sessions = restClient.get()
                .uri("/admin/realms/{realm}/users/{id}/sessions", realm, userId)
                .header("Authorization", "Bearer " + token())
                .retrieve()
                .body(List.class);
        return sessions == null ? 0 : sessions.size();
    }

    private static boolean isApplicationRole(String name) {
        for (AppRole role : AppRole.values()) {
            if (role.name().equals(name)) return true;
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> realmRoleMappings(String userId) {
        List<Map<String, Object>> roles = restClient.get()
                .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", realm, userId)
                .header("Authorization", "Bearer " + token())
                .retrieve()
                .body(List.class);
        return roles == null ? List.of() : roles;
    }

    private List<String> realmRoleNames(String userId) {
        return realmRoleMappings(userId).stream().map(role -> str(role.get("name"))).toList();
    }

    private Map<String, Object> realmRole(String name) {
        Map<String, Object> role = restClient.get()
                .uri("/admin/realms/{realm}/roles/{name}", realm, name)
                .header("Authorization", "Bearer " + token())
                .retrieve()
                .body(Map.class);
        if (role == null) throw new IllegalStateException("Realm role " + name + " is missing from Keycloak");
        return Map.of("id", role.get("id"), "name", role.get("name"));
    }

    @SuppressWarnings("unchecked")
    private synchronized String token() {
        if (cachedToken != null && Instant.now().isBefore(cachedTokenExpiry)) {
            return cachedToken;
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);

        Map<String, Object> response = restClient.post()
                .uri("/realms/{realm}/protocol/openid-connect/token", realm)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);

        if (response == null || response.get("access_token") == null) {
            throw new IllegalStateException("Keycloak did not return a service account token");
        }

        cachedToken = String.valueOf(response.get("access_token"));
        long expiresIn = response.get("expires_in") instanceof Number number ? number.longValue() : 60L;
        cachedTokenExpiry = Instant.now().plus(Duration.ofSeconds(Math.max(expiresIn - 30, 10)));
        return cachedToken;
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}

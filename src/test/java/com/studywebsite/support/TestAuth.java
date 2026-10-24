package com.studywebsite.support;

import com.studywebsite.security.AppRole;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Set;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

/**
 * Signs a test request in as a given role. This mirrors what
 * {@code LocalUserProvisioningFilter} leaves in the context after a real Keycloak token is
 * validated, so controllers and {@code @PreAuthorize} see exactly what they would in production.
 */
public final class TestAuth {

    private TestAuth() {
    }

    public static AuthenticatedUserPrincipal principal(Long userId, AppRole role) {
        return new AuthenticatedUserPrincipal(
                "kc-" + userId,
                userId,
                "user" + userId,
                "user" + userId + "@example.com",
                role,
                Set.of(role.name())
        );
    }

    public static RequestPostProcessor as(Long userId, AppRole role) {
        AuthenticatedUserPrincipal principal = principal(userId, role);
        return authentication(new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority(role.authority()))
        ));
    }

    public static RequestPostProcessor viewer(Long userId) {
        return as(userId, AppRole.VIEWER);
    }

    public static RequestPostProcessor contributor(Long userId) {
        return as(userId, AppRole.CONTRIBUTOR);
    }

    public static RequestPostProcessor admin(Long userId) {
        return as(userId, AppRole.ADMIN);
    }
}

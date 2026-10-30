package com.studywebsite.security;

import com.studywebsite.model.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Swaps the raw JWT authentication for an {@link AuthenticatedUserPrincipal}, so controllers keep
 * working against a local user id and role without knowing where the token came from.
 */
@Component
@RequiredArgsConstructor
public class LocalUserProvisioningFilter extends OncePerRequestFilter {

    private final LocalUserProvisioningService provisioningService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            Jwt jwt = jwtAuthentication.getToken();
            User user = provisioningService.resolve(jwt);

            if (Boolean.TRUE.equals(user.getBanned())) {
                SecurityContextHolder.clearContext();
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "This account has been suspended");
                return;
            }

            AppRole role = AppRole.highestOf(jwtAuthentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(authority -> authority.startsWith(AppRole.ROLE_PREFIX))
                    .map(authority -> authority.substring(AppRole.ROLE_PREFIX.length()))
                    .toList());
            Set<String> roles = new HashSet<>(KeycloakRealmRoleConverter.realmRoles(jwt));
            roles.removeIf(realmRole -> Arrays.stream(AppRole.values())
                    .anyMatch(appRole -> appRole.name().equals(realmRole)));
            roles.add(role.name());
            AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(
                    jwt.getSubject(),
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    role,
                    Set.copyOf(roles)
            );

            UsernamePasswordAuthenticationToken replacement = new UsernamePasswordAuthenticationToken(
                    principal, jwt, jwtAuthentication.getAuthorities());
            replacement.setDetails(jwtAuthentication.getDetails());
            SecurityContextHolder.getContext().setAuthentication(replacement);
        }

        filterChain.doFilter(request, response);
    }
}

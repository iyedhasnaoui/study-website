package com.studywebsite.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Turns the realm roles Keycloak puts in {@code realm_access.roles} into Spring authorities.
 * Only the application's own roles are mapped; Keycloak's built-ins are ignored.
 */
@Component
public class KeycloakRealmRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        return new JwtAuthenticationToken(jwt, authorities(jwt), jwt.getSubject());
    }

    public static Collection<GrantedAuthority> authorities(Jwt jwt) {
        AppRole role = AppRole.highestOf(realmRoles(jwt));
        return List.of(new SimpleGrantedAuthority(role.authority()));
    }

    @SuppressWarnings("unchecked")
    public static Set<String> realmRoles(Jwt jwt) {
        Object realmAccess = jwt.getClaims().get("realm_access");
        if (!(realmAccess instanceof Map<?, ?> claim)) return Set.of();

        Object roles = ((Map<String, Object>) claim).get("roles");
        if (!(roles instanceof Collection<?> list)) return Set.of();

        return list.stream().map(String::valueOf).collect(java.util.stream.Collectors.toSet());
    }
}

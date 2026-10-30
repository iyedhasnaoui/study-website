package com.studywebsite.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
@Profile("dev")
public class DevRoleOverrideFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        AppRole role = requestedRole(request.getHeader("X-Dev-Role"));
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (role != null && auth instanceof JwtAuthenticationToken jwtAuth && auth.isAuthenticated()) {
            List<GrantedAuthority> authorities = new ArrayList<>(jwtAuth.getAuthorities());
            authorities.removeIf(authority -> isApplicationRoleAuthority(authority.getAuthority()));
            authorities.add(new SimpleGrantedAuthority(role.authority()));

            JwtAuthenticationToken newAuth = new JwtAuthenticationToken(
                    jwtAuth.getToken(),
                    authorities,
                    jwtAuth.getName()
            );
            newAuth.setDetails(jwtAuth.getDetails());
            SecurityContextHolder.getContext().setAuthentication(newAuth);
        }

        filterChain.doFilter(request, response);
    }

    private AppRole requestedRole(String value) {
        if (value == null) return null;
        try {
            return AppRole.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private boolean isApplicationRoleAuthority(String authority) {
        for (AppRole role : AppRole.values()) {
            if (role.authority().equals(authority)) return true;
        }
        return false;
    }
}
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

@Component
@Profile("dev")
public class DevRoleOverrideFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String devRole = request.getHeader("X-Dev-Role");
        if (devRole != null && "ADMIN".equalsIgnoreCase(devRole)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                List<GrantedAuthority> authorities = new ArrayList<>(jwtAuth.getAuthorities());
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));

                JwtAuthenticationToken newAuth = new JwtAuthenticationToken(
                        jwtAuth.getToken(),
                        authorities,
                        jwtAuth.getName()
                );
                newAuth.setDetails(jwtAuth.getDetails());
                SecurityContextHolder.getContext().setAuthentication(newAuth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
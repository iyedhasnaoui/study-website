package com.studywebsite.controller.auth;

import com.studywebsite.dto.auth.AuthResponse;
import com.studywebsite.dto.auth.LoginRequest;
import com.studywebsite.dto.auth.RegisterRequest;
import com.studywebsite.dto.auth.RegisterResponse;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.service.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse response = authService.register(request);
        URI location = URI.create("/api/users/" + response.user().id());
        return ResponseEntity.created(location).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @DeleteMapping("/session")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        authService.logout(principal.sessionId());
        return ResponseEntity.noContent().build();
    }
}

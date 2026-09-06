package com.studywebsite.service.auth;

import com.studywebsite.dto.auth.AuthResponse;
import com.studywebsite.dto.auth.AuthenticatedUserResponse;
import com.studywebsite.dto.auth.LoginRequest;
import com.studywebsite.dto.auth.RegisterRequest;
import com.studywebsite.dto.auth.RegisterResponse;
import com.studywebsite.model.User;
import com.studywebsite.model.UserRole;
import com.studywebsite.model.UserRoleId;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.UserRoleRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final String DEFAULT_ROLE = "USER";

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenService authTokenService;
    private final String dummyPasswordHash;

    public AuthService(
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            AuthTokenService authTokenService
    ) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.authTokenService = authTokenService;
        this.dummyPasswordHash = passwordEncoder.encode("not-a-real-user-password");
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String username = normalizeUsername(request.username());
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException();
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new DuplicateUsernameException();
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setNumberContributions(0);
        user.setTrustScore(0.0);
        user.setJoinedAt(LocalDateTime.now());

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new DuplicateAccountException();
        }

        UserRole userRole = UserRole.builder()
                .id(new UserRoleId(user.getId(), DEFAULT_ROLE))
                .user(user)
                .role(DEFAULT_ROLE)
                .build();
        userRoleRepository.save(userRole);

        return new RegisterResponse(toResponse(user, Set.of(DEFAULT_ROLE)));
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            throw new InvalidCredentialsException();
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        AuthTokenService.IssuedToken token = authTokenService.issueAuthentication(user);
        Set<String> roles = user.getUserRoles().stream()
                .map(UserRole::getRole)
                .collect(Collectors.toUnmodifiableSet());

        return new AuthResponse(
                token.value(),
                "Bearer",
                token.expiresAt(),
                toResponse(user, roles)
        );
    }

    @Transactional
    public void logout(Long sessionId) {
        authTokenService.invalidateAuthentication(sessionId);
    }

    private String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private String normalizeUsername(String username) {
        return username.strip();
    }

    private AuthenticatedUserResponse toResponse(User user, Set<String> roles) {
        return new AuthenticatedUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                Set.copyOf(roles),
                user.getJoinedAt()
        );
    }
}

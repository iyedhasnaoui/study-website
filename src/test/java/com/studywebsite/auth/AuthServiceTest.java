package com.studywebsite.auth;

import com.studywebsite.dto.auth.AuthResponse;
import com.studywebsite.dto.auth.LoginRequest;
import com.studywebsite.dto.auth.RegisterRequest;
import com.studywebsite.dto.auth.RegisterResponse;
import com.studywebsite.model.User;
import com.studywebsite.model.UserRole;
import com.studywebsite.model.UserRoleId;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.UserRoleRepository;
import com.studywebsite.service.auth.AuthService;
import com.studywebsite.service.auth.AuthTokenService;
import com.studywebsite.service.auth.DuplicateEmailException;
import com.studywebsite.service.auth.DuplicateUsernameException;
import com.studywebsite.service.auth.InvalidCredentialsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthTokenService authTokenService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode("not-a-real-user-password")).thenReturn("dummy-hash");
        authService = new AuthService(userRepository, userRoleRepository, passwordEncoder, authTokenService);
    }

    @Test
    void registerNormalizesEmailHashesPasswordAndAssignsUserRole() {
        when(userRepository.existsByEmailIgnoreCase("student@example.com")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase("Student.example")).thenReturn(false);
        when(passwordEncoder.encode("correct-horse")).thenReturn("stored-hash");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(10L);
            return user;
        });

        RegisterResponse response = authService.register(
                new RegisterRequest(" Student.example ", " Student@Example.COM ", "correct-horse")
        );

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getUsername()).isEqualTo("Student.example");
        assertThat(savedUser.getEmail()).isEqualTo("student@example.com");
        assertThat(savedUser.getPasswordHash()).isEqualTo("stored-hash");
        assertThat(response.user().roles()).containsExactly("USER");
        assertThat(response.user().username()).isEqualTo("Student.example");

        ArgumentCaptor<UserRole> roleCaptor = ArgumentCaptor.forClass(UserRole.class);
        verify(userRoleRepository).save(roleCaptor.capture());
        assertThat(roleCaptor.getValue().getId()).isEqualTo(new UserRoleId(10L, "USER"));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        when(userRepository.existsByEmailIgnoreCase("student@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("student", "student@example.com", "correct-horse")
        )).isInstanceOf(DuplicateEmailException.class);

        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void registerRejectsDuplicateUsernameIgnoringCase() {
        when(userRepository.existsByUsernameIgnoreCase("Student")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new RegisterRequest("Student", "new@example.com", "correct-horse")
        )).isInstanceOf(DuplicateUsernameException.class);
    }

    @Test
    void loginReturnsBearerTokenForCorrectCredentials() {
        User user = userWithRole();
        when(userRepository.findByEmailIgnoreCase("student@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct-horse", "stored-hash")).thenReturn(true);
        when(authTokenService.issueAuthentication(user)).thenReturn(
                new AuthTokenService.IssuedToken("raw-token", Instant.parse("2030-01-01T00:00:00Z"), 50L)
        );

        AuthResponse response = authService.login(new LoginRequest("Student@Example.com", "correct-horse"));

        assertThat(response.accessToken()).isEqualTo("raw-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.user().username()).isEqualTo("student");
        assertThat(response.user().roles()).containsExactly("USER");
    }

    @Test
    void loginUsesSamePublicErrorForUnknownEmailAndWrongPassword() {
        when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.matches("wrong-password", "dummy-hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("missing@example.com", "wrong-password")
        )).isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid email or password");
    }

    private User userWithRole() {
        User user = new User();
        user.setId(10L);
        user.setUsername("student");
        user.setEmail("student@example.com");
        user.setPasswordHash("stored-hash");
        user.setJoinedAt(LocalDateTime.parse("2026-08-28T10:00:00"));

        UserRole role = UserRole.builder()
                .id(new UserRoleId(10L, "USER"))
                .user(user)
                .role("USER")
                .build();
        user.setUserRoles(new ArrayList<>());
        user.getUserRoles().add(role);
        return user;
    }
}

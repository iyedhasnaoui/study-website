package com.studywebsite.service;

import com.studywebsite.model.User;
import com.studywebsite.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void create_shouldSaveAndReturnUser() {
        User user = buildUser(1L, "alice@example.com", "alice");
        when(userRepository.save(user)).thenReturn(user);

        User result = userService.create(user);

        assertThat(result).isSameAs(user);
        verify(userRepository).save(user);
    }

    @Test
    void getById_shouldReturnUser_whenUserExists() {
        User user = buildUser(1L, "alice@example.com", "alice");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        User result = userService.getById(1L);

        assertThat(result).isEqualTo(user);
        verify(userRepository).findById(1L);
    }

    @Test
    void getById_shouldThrowRuntimeException_whenUserDoesNotExist() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getById(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Entity not found");
        verify(userRepository).findById(99L);
    }

    @Test
    void getAll_shouldReturnAllUsers() {
        List<User> users = List.of(
                buildUser(1L, "alice@example.com", "alice"),
                buildUser(2L, "bob@example.com", "bob")
        );
        when(userRepository.findAll()).thenReturn(users);

        List<User> result = userService.getAll();

        assertThat(result).hasSize(2).containsExactlyElementsOf(users);
        verify(userRepository).findAll();
    }

    @Test
    void delete_shouldDelegateToRepository() {
        userService.delete(1L);

        verify(userRepository).deleteById(1L);
    }

    @Test
    void findByTrustScoreGreaterThan_shouldDelegateToRepository() {
        List<User> users = List.of(buildUser(1L, "alice@example.com", "alice"));
        when(userRepository.findByTrustScoreGreaterThan(5.0)).thenReturn(users);

        List<User> result = userService.findByTrustScoreGreaterThan(5.0);

        assertThat(result).containsExactlyElementsOf(users);
        verify(userRepository).findByTrustScoreGreaterThan(5.0);
    }

    @Test
    void findByNumberContributionsGreaterThan_shouldDelegateToRepository() {
        List<User> users = List.of(buildUser(2L, "bob@example.com", "bob"));
        when(userRepository.findByNumberContributionsGreaterThan(10)).thenReturn(users);

        List<User> result = userService.findByNumberContributionsGreaterThan(10);

        assertThat(result).containsExactlyElementsOf(users);
        verify(userRepository).findByNumberContributionsGreaterThan(10);
    }

    private User buildUser(Long id, String email, String username) {
        return User.builder()
                .id(id)
                .email(email)
                .username(username)
                .passwordHash("hashedPassword")
                .numberContributions(12)
                .trustScore(8.5)
                .build();
    }
}


package com.studywebsite.repository;

import com.studywebsite.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByTrustScoreGreaterThan_shouldReturnMatchingUsers() {
        userRepository.saveAll(List.of(
                buildUser("alice@example.com", "alice", 2, 0.8),
                buildUser("bob@example.com", "bob", 5, 0.4),
                buildUser("charlie@example.com", "charlie", 8, 1.2)
        ));

        List<User> result = userRepository.findByTrustScoreGreaterThan(0.5);

        assertThat(result)
                .extracting(User::getUsername)
                .containsExactlyInAnyOrder("alice", "charlie");
    }

    @Test
    void findByNumberContributionsGreaterThan_shouldReturnMatchingUsers() {
        userRepository.saveAll(List.of(
                buildUser("alice@example.com", "alice", 3, 0.8),
                buildUser("bob@example.com", "bob", 7, 0.6),
                buildUser("charlie@example.com", "charlie", 10, 1.2)
        ));

        List<User> result = userRepository.findByNumberContributionsGreaterThan(5);

        assertThat(result)
                .extracting(User::getUsername)
                .containsExactlyInAnyOrder("bob", "charlie");
    }

    private User buildUser(String email, String username, int contributions, double trustScore) {
        return User.builder()
                .email(email)
                .username(username)
                .passwordHash("hashedPassword")
                .numberContributions(contributions)
                .trustScore(trustScore)
                .joinedAt(LocalDateTime.now())
                .build();
    }
}


package com.studywebsite.repository;

import com.studywebsite.model.ForumPost;
import com.studywebsite.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ForumPostRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ForumPostRepository forumPostRepository;

    @Test
    void findByAuthor_Id_shouldReturnPostsForTheAuthor() {
        User authorOne = saveUser("alice@example.com", "alice");
        User authorTwo = saveUser("bob@example.com", "bob");

        forumPostRepository.saveAll(List.of(
                buildPost(authorOne, "Spring Boot Basics", "Learn Spring Boot"),
                buildPost(authorOne, "Java Collections", "Learn collections"),
                buildPost(authorTwo, "Advanced JPA", "Learn JPA")
        ));

        List<ForumPost> result = forumPostRepository.findByAuthor_Id(authorOne.getId());

        assertThat(result)
                .extracting(ForumPost::getTitle)
                .containsExactlyInAnyOrder("Spring Boot Basics", "Java Collections");
    }

    @Test
    void findByTitleContainingIgnoreCase_shouldReturnMatchingPosts() {
        User author = saveUser("alice@example.com", "alice");

        forumPostRepository.saveAll(List.of(
                buildPost(author, "Spring Boot Basics", "Learn Spring Boot"),
                buildPost(author, "Java Collections", "Learn collections"),
                buildPost(author, "Advanced JPA", "Learn JPA")
        ));

        List<ForumPost> result = forumPostRepository.findByTitleContainingIgnoreCase("spring");

        assertThat(result)
                .extracting(ForumPost::getTitle)
                .containsExactly("Spring Boot Basics");
    }

    private User saveUser(String email, String username) {
        return userRepository.save(User.builder()
                .email(email)
                .username(username)
                .passwordHash("hashedPassword")
                .build());
    }

    private ForumPost buildPost(User author, String title, String content) {
        return ForumPost.builder()
                .author(author)
                .title(title)
                .content(content)
                .build();
    }
}


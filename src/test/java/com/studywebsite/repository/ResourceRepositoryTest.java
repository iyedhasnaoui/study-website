package com.studywebsite.repository;

import com.studywebsite.model.Resource;
import com.studywebsite.model.ResourceType;
import com.studywebsite.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ResourceRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Test
    void findByType_shouldReturnResourcesOfMatchingType() {
        User author = saveUser("alice@example.com", "alice");

        resourceRepository.saveAll(List.of(
                buildResource(author, "Java Guide", ResourceType.PDF, "/docs/java-guide.pdf"),
                buildResource(author, "Spring Intro", ResourceType.VIDEO, "/videos/spring-intro.mp4"),
                buildResource(author, "Audio Lesson", ResourceType.AUDIO, "/audio/audio-lesson.mp3")
        ));

        List<Resource> result = resourceRepository.findByType(ResourceType.VIDEO);

        assertThat(result)
                .extracting(Resource::getTitle)
                .containsExactly("Spring Intro");
    }

    @Test
    void findByAuthor_Id_shouldReturnResourcesForTheAuthor() {
        User authorOne = saveUser("alice@example.com", "alice");
        User authorTwo = saveUser("bob@example.com", "bob");

        resourceRepository.saveAll(List.of(
                buildResource(authorOne, "Java Guide", ResourceType.PDF, "/docs/java-guide.pdf"),
                buildResource(authorOne, "Spring Intro", ResourceType.VIDEO, "/videos/spring-intro.mp4"),
                buildResource(authorTwo, "Roadmap", ResourceType.ROADMAP, "/roadmaps/roadmap.pdf")
        ));

        List<Resource> result = resourceRepository.findByAuthor_Id(authorOne.getId());

        assertThat(result)
                .extracting(Resource::getTitle)
                .containsExactlyInAnyOrder("Java Guide", "Spring Intro");
    }

    private User saveUser(String email, String username) {
        return userRepository.save(User.builder()
                .email(email)
                .username(username)
                .passwordHash("hashedPassword")
                .build());
    }

    private Resource buildResource(User author, String title, ResourceType type, String path) {
        return Resource.builder()
                .author(author)
                .title(title)
                .type(type)
                .path(path)
                .build();
    }
}


package com.studywebsite.service;

import com.studywebsite.model.Resource;
import com.studywebsite.model.ResourceType;
import com.studywebsite.model.User;
import com.studywebsite.repository.ResourceRepository;
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
class ResourceServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    @InjectMocks
    private ResourceService resourceService;

    @Test
    void create_shouldSaveAndReturnResource() {
        User author = buildUser(1L, "alice@example.com", "alice");
        Resource resource = buildResource(1L, author, "Java Guide", ResourceType.PDF, "/docs/java-guide.pdf");
        when(resourceRepository.save(resource)).thenReturn(resource);

        Resource result = resourceService.create(resource);

        assertThat(result).isSameAs(resource);
        verify(resourceRepository).save(resource);
    }

    @Test
    void getById_shouldReturnResource_whenExists() {
        User author = buildUser(1L, "alice@example.com", "alice");
        Resource resource = buildResource(1L, author, "Java Guide", ResourceType.PDF, "/docs/java-guide.pdf");
        when(resourceRepository.findById(1L)).thenReturn(Optional.of(resource));

        Resource result = resourceService.getById(1L);

        assertThat(result).isEqualTo(resource);
        verify(resourceRepository).findById(1L);
    }

    @Test
    void getById_shouldThrowRuntimeException_whenResourceDoesNotExist() {
        when(resourceRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> resourceService.getById(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Entity not found");
        verify(resourceRepository).findById(99L);
    }

    @Test
    void getAll_shouldReturnAllResources() {
        User author = buildUser(1L, "alice@example.com", "alice");
        List<Resource> resources = List.of(
                buildResource(1L, author, "Java Guide", ResourceType.PDF, "/docs/java-guide.pdf"),
                buildResource(2L, author, "Spring Intro", ResourceType.VIDEO, "/videos/spring-intro.mp4")
        );
        when(resourceRepository.findAll()).thenReturn(resources);

        List<Resource> result = resourceService.getAll();

        assertThat(result).hasSize(2).containsExactlyElementsOf(resources);
        verify(resourceRepository).findAll();
    }

    @Test
    void delete_shouldDelegateToRepository() {
        resourceService.delete(1L);

        verify(resourceRepository).deleteById(1L);
    }

    @Test
    void findByType_shouldDelegateToRepository() {
        User author = buildUser(1L, "alice@example.com", "alice");
        List<Resource> resources = List.of(buildResource(1L, author, "Java Guide", ResourceType.PDF, "/docs/java-guide.pdf"));
        when(resourceRepository.findByType(ResourceType.PDF)).thenReturn(resources);

        List<Resource> result = resourceService.findByType(ResourceType.PDF);

        assertThat(result).containsExactlyElementsOf(resources);
        verify(resourceRepository).findByType(ResourceType.PDF);
    }

    @Test
    void findByAuthorId_shouldDelegateToRepository() {
        User author = buildUser(1L, "alice@example.com", "alice");
        List<Resource> resources = List.of(buildResource(1L, author, "Java Guide", ResourceType.PDF, "/docs/java-guide.pdf"));
        when(resourceRepository.findByAuthor_Id(1L)).thenReturn(resources);

        List<Resource> result = resourceService.findByAuthorId(1L);

        assertThat(result).containsExactlyElementsOf(resources);
        verify(resourceRepository).findByAuthor_Id(1L);
    }

    private User buildUser(Long id, String email, String username) {
        return User.builder()
                .id(id)
                .email(email)
                .username(username)
                .passwordHash("hashedPassword")
                .build();
    }

    private Resource buildResource(Long id, User author, String title, ResourceType type, String path) {
        return Resource.builder()
                .id(id)
                .author(author)
                .title(title)
                .type(type)
                .path(path)
                .build();
    }
}


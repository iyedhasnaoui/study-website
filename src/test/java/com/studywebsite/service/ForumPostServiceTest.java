package com.studywebsite.service;

import com.studywebsite.model.ForumPost;
import com.studywebsite.model.User;
import com.studywebsite.repository.ForumPostRepository;
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
class ForumPostServiceTest {

    @Mock
    private ForumPostRepository forumPostRepository;

    @InjectMocks
    private ForumPostService forumPostService;

    @Test
    void create_shouldSaveAndReturnForumPost() {
        User author = buildUser(1L, "alice@example.com", "alice");
        ForumPost post = buildForumPost(1L, author, "Spring Boot", "Intro to Boot");
        when(forumPostRepository.save(post)).thenReturn(post);

        ForumPost result = forumPostService.create(post);

        assertThat(result).isSameAs(post);
        verify(forumPostRepository).save(post);
    }

    @Test
    void getById_shouldReturnForumPost_whenExists() {
        User author = buildUser(1L, "alice@example.com", "alice");
        ForumPost post = buildForumPost(1L, author, "Spring Boot", "Intro to Boot");
        when(forumPostRepository.findById(1L)).thenReturn(Optional.of(post));

        ForumPost result = forumPostService.getById(1L);

        assertThat(result).isEqualTo(post);
        verify(forumPostRepository).findById(1L);
    }

    @Test
    void getById_shouldThrowRuntimeException_whenForumPostDoesNotExist() {
        when(forumPostRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> forumPostService.getById(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ForumPost entity not found");
        verify(forumPostRepository).findById(99L);
    }

    @Test
    void getAll_shouldReturnAllForumPosts() {
        User author = buildUser(1L, "alice@example.com", "alice");
        List<ForumPost> posts = List.of(
                buildForumPost(1L, author, "Spring Boot", "Intro to Boot"),
                buildForumPost(2L, author, "JPA", "Entity mapping")
        );
        when(forumPostRepository.findAll()).thenReturn(posts);

        List<ForumPost> result = forumPostService.getAll();

        assertThat(result).hasSize(2).containsExactlyElementsOf(posts);
        verify(forumPostRepository).findAll();
    }

    @Test
    void delete_shouldDelegateToRepository() {
        when(forumPostRepository.existsById(1L)).thenReturn(true);

        forumPostService.delete(1L);

        verify(forumPostRepository).existsById(1L);
        verify(forumPostRepository).deleteById(1L);
    }

    @Test
    void findByAuthorId_shouldDelegateToRepository() {
        User author = buildUser(1L, "alice@example.com", "alice");
        List<ForumPost> posts = List.of(buildForumPost(1L, author, "Spring Boot", "Intro to Boot"));
        when(forumPostRepository.findByAuthor_Id(1L)).thenReturn(posts);

        List<ForumPost> result = forumPostService.findByAuthorId(1L);

        assertThat(result).containsExactlyElementsOf(posts);
        verify(forumPostRepository).findByAuthor_Id(1L);
    }

    @Test
    void searchByTitle_shouldDelegateToRepository() {
        User author = buildUser(1L, "alice@example.com", "alice");
        List<ForumPost> posts = List.of(buildForumPost(1L, author, "Spring Boot", "Intro to Boot"));
        when(forumPostRepository.findByTitleContainingIgnoreCase("spring")).thenReturn(posts);

        List<ForumPost> result = forumPostService.searchByTitle("spring");

        assertThat(result).containsExactlyElementsOf(posts);
        verify(forumPostRepository).findByTitleContainingIgnoreCase("spring");
    }

    private User buildUser(Long id, String email, String username) {
        return User.builder()
                .id(id)
                .email(email)
                .username(username)
                .passwordHash("hashedPassword")
                .build();
    }

    private ForumPost buildForumPost(Long id, User author, String title, String content) {
        return ForumPost.builder()
                .id(id)
                .author(author)
                .title(title)
                .content(content)
                .build();
    }
}


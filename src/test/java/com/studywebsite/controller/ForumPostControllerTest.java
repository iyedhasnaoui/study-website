package com.studywebsite.controller;

import com.studywebsite.dto.ForumPostCreateDto;
import com.studywebsite.model.ForumPost;
import com.studywebsite.model.User;
import com.studywebsite.service.ForumPostService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ForumPostController.class)
@WithMockUser // creates a fake authentification token, without this annotation these tests will fail ( Spring Security will reject all HTTP requests )
class ForumPostControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ForumPostService forumPostService;

    @Test
    void postValidInputReturnsCreated() throws Exception {
        ForumPostCreateDto create = ForumPostCreateDto.builder()
                .title("A valid title")
                .content("This is valid content with enough length.")
                .tags(List.of("java", "spring"))
                .build();

        User author = new User();
        author.setId(2L);
        author.setUsername("jdoe");

        ForumPost saved = ForumPost.builder()
                .id(10L)
                .title(create.getTitle())
                .content(create.getContent())
                .author(author)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(forumPostService.create(ArgumentMatchers.any(ForumPost.class))).thenReturn(saved);

        mockMvc.perform(post("/api/forum/posts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "2")
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.title").value(create.getTitle()))
                .andExpect(jsonPath("$.authorId").value(2))
                .andExpect(jsonPath("$.authorUsername").value("jdoe"));
    }

    @Test
    void postInvalidShortTitleReturnsBadRequest() throws Exception {
        ForumPostCreateDto create = ForumPostCreateDto.builder()
                .title("abc")
                .content("This content is fine and long enough.")
                .build();

        mockMvc.perform(post("/api/forum/posts").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getByIdReturnsPost() throws Exception {
        User author = new User();
        author.setId(5L);
        author.setUsername("alice");

        ForumPost post = ForumPost.builder()
                .id(7L)
                .title("Hello")
                .content("Content here")
                .author(author)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(forumPostService.getById(7L)).thenReturn(post);

        mockMvc.perform(get("/api/forum/posts/7").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.authorId").value(5))
                .andExpect(jsonPath("$.authorUsername").value("alice"));
    }

    @Test
    void deleteByIdReturnsNoContent() throws Exception {
        doNothing().when(forumPostService).delete(99L);

        mockMvc.perform(delete("/api/forum/posts/99").with(csrf()))
                .andExpect(status().isNoContent());
    }
}


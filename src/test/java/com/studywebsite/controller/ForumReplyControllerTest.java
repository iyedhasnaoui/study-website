package com.studywebsite.controller;

import com.studywebsite.dto.ForumReplyCreateDto;
import com.studywebsite.model.ForumPost;
import com.studywebsite.model.ForumReply;
import com.studywebsite.model.User;
import com.studywebsite.service.ForumReplyService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ForumReplyController.class)
@WithMockUser
class ForumReplyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ForumReplyService forumReplyService;

    @Test
    void postValidInputReturnsCreated() throws Exception {
        ForumReplyCreateDto create = ForumReplyCreateDto.builder()
                .content("This is a valid reply with enough content.")
                .build();

        User author = new User();
        author.setId(2L);
        author.setUsername("jdoe");

        ForumPost post = new ForumPost();
        post.setId(1L);

        ForumReply saved = ForumReply.builder()
                .id(10L)
                .content(create.getContent())
                .author(author)
                .post(post)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(forumReplyService.create(ArgumentMatchers.any(ForumReply.class))).thenReturn(saved);

        mockMvc.perform(post("/api/forum/posts/1/replies")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-Id", "2")
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.postId").value(1))
                .andExpect(jsonPath("$.content").value(create.getContent()))
                .andExpect(jsonPath("$.authorId").value(2))
                .andExpect(jsonPath("$.authorUsername").value("jdoe"));
    }

    @Test
    void postInvalidShortContentReturnsBadRequest() throws Exception {
        ForumReplyCreateDto create = ForumReplyCreateDto.builder()
                .content("")
                .build();

        mockMvc.perform(post("/api/forum/posts/1/replies").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getByIdReturnsReply() throws Exception {
        User author = new User();
        author.setId(5L);
        author.setUsername("alice");

        ForumPost post = new ForumPost();
        post.setId(1L);

        ForumReply reply = ForumReply.builder()
                .id(7L)
                .content("This is a reply")
                .author(author)
                .post(post)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(forumReplyService.getById(7L)).thenReturn(reply);

        mockMvc.perform(get("/api/forum/posts/1/replies/7").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.postId").value(1))
                .andExpect(jsonPath("$.authorId").value(5))
                .andExpect(jsonPath("$.authorUsername").value("alice"));
    }

    @Test
    void deleteByIdReturnsNoContent() throws Exception {
        User author = new User();
        author.setId(5L);

        ForumPost post = new ForumPost();
        post.setId(1L);

        ForumReply reply = ForumReply.builder()
                .id(99L)
                .author(author)
                .post(post)
                .build();

        when(forumReplyService.getById(99L)).thenReturn(reply);
        doNothing().when(forumReplyService).delete(99L);

        mockMvc.perform(delete("/api/forum/posts/1/replies/99").with(csrf()))
                .andExpect(status().isNoContent());
    }
}


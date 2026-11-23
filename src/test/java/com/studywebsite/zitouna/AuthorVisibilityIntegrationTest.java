package com.studywebsite.zitouna;

import com.studywebsite.model.*;
import com.studywebsite.repository.*;
import com.studywebsite.security.AppRole;
import com.studywebsite.support.TestAuth;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** All data and schema live in the test-only H2 database. No identity server is contacted. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthorVisibilityIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ForumPostRepository posts;
    @Autowired ForumReplyRepository replies;
    @Autowired RoadmapRepository roadmaps;
    @Autowired RoadmapNodeRepository nodes;
    @Autowired ResourceRepository resources;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean com.studywebsite.service.admin.KeycloakAdminClient keycloak;
    @Autowired com.studywebsite.service.admin.AdminUserService adminUsers;
    @Autowired ForumAttachmentRepository attachments;
    @MockitoBean com.studywebsite.service.media.ForumAttachmentStorageService attachmentStorage;
    @MockitoBean com.studywebsite.service.LearningMaterialStorageService materialStorage;
    @org.junit.jupiter.api.io.TempDir java.nio.file.Path files;

    private MockHttpServletRequestBuilder read(String path, String role) {
        var request = get(path);
        return role.equals("ANONYMOUS") ? request : request.with(TestAuth.as(999L, AppRole.valueOf(role)));
    }


    @org.junit.jupiter.api.Test
    void deletingAnAccountRetainsItsContributionsButHidesThem() throws Exception {
        User author = users.saveAndFlush(User.builder().username("deleted-author").email("deleted@test.invalid")
                .passwordHash("external").keycloakId("kc-deleted-author").build());
        ForumPost post = posts.saveAndFlush(ForumPost.builder().author(author).title("Retained contribution")
                .content("Retained after account deletion").moderationStatus(ModerationStatus.APPROVED).build());
        org.mockito.Mockito.when(keycloak.findUser(author.getKeycloakId())).thenReturn(java.util.Optional.of(
                new com.studywebsite.service.admin.KeycloakAdminClient.KeycloakUser(
                        author.getKeycloakId(), author.getUsername(), author.getEmail(), true, AppRole.CONTRIBUTOR)));
        org.mockito.Mockito.when(keycloak.roleOf(author.getKeycloakId())).thenReturn(AppRole.CONTRIBUTOR);
        mvc.perform(read("/api/forum/posts/" + post.getId(), "ANONYMOUS")).andExpect(status().isOk());
        adminUsers.removeUser("kc-deleted-author");
        users.flush();
        assertThat(author.getBanned()).isTrue();
        assertThat(author.getKeycloakId()).isNull();
        assertThat(posts.findById(post.getId())).isPresent();
        mvc.perform(read("/api/forum/posts/" + post.getId(), "ANONYMOUS")).andExpect(status().isNotFound());
        mvc.perform(read("/api/forum/posts/" + post.getId(), "ADMIN")).andExpect(status().isOk());
        org.mockito.Mockito.verify(keycloak).deleteUser("kc-deleted-author");
    }

    @ParameterizedTest(name = "{0} reads content from {1} author")
    @CsvSource({
        "ANONYMOUS,ACTIVE", "VIEWER,ACTIVE", "CONTRIBUTOR,ACTIVE", "ADMIN,ACTIVE",
        "ANONYMOUS,BANNED", "VIEWER,BANNED", "CONTRIBUTOR,BANNED", "ADMIN,BANNED",
        "ANONYMOUS,DELETED", "VIEWER,DELETED", "CONTRIBUTOR,DELETED", "ADMIN,DELETED"
    })
    void contributionReadsRespectAuthorState(String role, String state) throws Exception {
        User author = users.saveAndFlush(User.builder().username("author").email("author@test.invalid")
                .passwordHash("external").keycloakId(state.equals("DELETED") ? null : "kc-author")
                .banned(!state.equals("ACTIVE")).build());
        User active = users.saveAndFlush(User.builder().username("active").email("active@test.invalid")
                .passwordHash("external").keycloakId("kc-active").build());
        ForumPost post = posts.saveAndFlush(ForumPost.builder().author(author).title("Stored forum title")
                .content("Stored forum content").moderationStatus(ModerationStatus.APPROVED).build());
        ForumPost activePost = posts.saveAndFlush(ForumPost.builder().author(active).title("Active forum title")
                .content("Active forum content").moderationStatus(ModerationStatus.APPROVED).build());
        ForumReply reply = replies.saveAndFlush(ForumReply.builder().post(activePost).author(author).content("Stored reply").build());
        ForumReply child = replies.saveAndFlush(ForumReply.builder().post(post).author(active).content("Child of hidden post").build());
        Roadmap roadmap = roadmaps.saveAndFlush(Roadmap.builder().author(author).title("Stored roadmap")
                .moderationStatus(ModerationStatus.APPROVED).build());
        RoadmapNode node = nodes.saveAndFlush(RoadmapNode.builder().roadmap(roadmap).title("Stored node")
                .nodeType(RoadmapNodeType.ROOT).positionX(0.0).positionY(0.0).gate(false).build());
        Resource material = resources.saveAndFlush(Resource.builder().author(author).title("Stored material")
                .type(ResourceType.PDF).path("local-test.pdf").moderationStatus(ModerationStatus.APPROVED).build());
        java.nio.file.Path file = files.resolve("test.pdf");
        java.nio.file.Files.writeString(file, "test content");
        org.mockito.Mockito.when(materialStorage.load("local-test.pdf"))
                .thenReturn(new org.springframework.core.io.FileSystemResource(file));
        org.mockito.Mockito.when(attachmentStorage.load(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(new org.springframework.core.io.FileSystemResource(file));
        ForumAttachment postAttachment = attachments.saveAndFlush(ForumAttachment.builder().post(post).author(author)
                .storedFilename("post-test.pdf").originalFilename("test.pdf").mimeType("application/pdf")
                .type(ForumAttachmentType.PDF).sizeBytes(12L).build());
        ForumAttachment replyAttachment = attachments.saveAndFlush(ForumAttachment.builder().reply(reply).author(author)
                .storedFilename("reply-test.pdf").originalFilename("test.pdf").mimeType("application/pdf")
                .type(ForumAttachmentType.PDF).sizeBytes(12L).build());
        ForumAttachment childAttachment = attachments.saveAndFlush(ForumAttachment.builder().reply(child).author(active)
                .storedFilename("child-test.pdf").originalFilename("test.pdf").mimeType("application/pdf")
                .type(ForumAttachmentType.PDF).sizeBytes(12L).build());
        boolean visible = state.equals("ACTIVE") || role.equals("ADMIN");
        int status = visible ? 200 : 404;
        java.util.List<org.junit.jupiter.api.function.Executable> checks = new java.util.ArrayList<>();
        checks.add(() -> mvc.perform(read("/api/forum/posts/" + post.getId(), role)).andExpect(status().is(status)));
        checks.add(() -> mvc.perform(read("/api/forum/posts", role)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(visible ? 2 : 1)));
        checks.add(() -> mvc.perform(read("/api/forum/posts/" + activePost.getId(), role)).andExpect(status().isOk()));
        checks.add(() -> mvc.perform(read("/api/forum/posts/" + activePost.getId() + "/replies", role))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(visible ? 1 : 0)));
        checks.add(() -> mvc.perform(read("/api/forum/posts/" + activePost.getId() + "/replies/" + reply.getId(), role))
                .andExpect(status().is(status)));
        checks.add(() -> mvc.perform(read("/api/forum/posts/" + post.getId() + "/replies/" + child.getId(), role))
                .andExpect(status().is(status)));
        checks.add(() -> mvc.perform(read("/api/forum/posts/" + post.getId() + "/replies", role))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(visible ? 1 : 0)));
        checks.add(() -> mvc.perform(read("/api/roadmaps", role)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(visible ? 1 : 0)));
        checks.add(() -> mvc.perform(read("/api/roadmaps/approved-titles", role)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(visible ? 1 : 0)));
        for (String suffix : new String[]{"", "/graph", "/nodes", "/nodes/" + node.getId()}) {
            checks.add(() -> mvc.perform(read("/api/roadmaps/" + roadmap.getId() + suffix, role)).andExpect(status().is(status)));
        }
        checks.add(() -> mvc.perform(read("/api/learning-materials", role)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(visible ? 1 : 0)));
        checks.add(() -> mvc.perform(read("/api/zitouna/feed", role)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(visible ? 4 : 1)));
        checks.add(() -> mvc.perform(read("/api/learning-materials/" + material.getId() + "/content", role))
                .andExpect(status().is(status)));
        for (ForumAttachment attachment : new ForumAttachment[]{postAttachment, replyAttachment, childAttachment}) {
            checks.add(() -> mvc.perform(read("/api/forum/attachments/" + attachment.getId() + "/content", role))
                    .andExpect(status().is(status)));
        }
        // Counts must not reveal the hidden replies either.
        activePost.getReplies().add(reply);
        checks.add(() -> mvc.perform(read("/api/forum/posts/" + activePost.getId(), role))
                .andExpect(jsonPath("$.replyCount").value(visible ? 1 : 0)));
        org.junit.jupiter.api.Assertions.assertAll("Author visibility across read endpoints", checks);
        // Queued content stays available for moderation, regardless of author state.
        post.setModerationStatus(ModerationStatus.PENDING);
        posts.saveAndFlush(post);
        mvc.perform(read("/api/admin/moderation", role))
                .andExpect(status().is(role.equals("ADMIN") ? 200 : role.equals("ANONYMOUS") ? 401 : 403));
        if (role.equals("ADMIN")) {
            mvc.perform(read("/api/admin/moderation", role)).andExpect(jsonPath("$.length()").value(1));
        }
        assertThat(posts.findById(post.getId())).isPresent();
        assertThat(replies.findById(reply.getId())).isPresent();
        assertThat(roadmaps.findById(roadmap.getId())).isPresent();
        assertThat(resources.findById(material.getId())).isPresent();
    }
}

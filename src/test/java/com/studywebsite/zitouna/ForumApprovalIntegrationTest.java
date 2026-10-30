package com.studywebsite.zitouna;

import com.studywebsite.model.*;
import com.studywebsite.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real role conversion/provisioning and method authorization; only JWT signature decoding is mocked. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ForumApprovalIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ForumPostRepository posts;
    @Autowired ForumReplyRepository replies;
    @Autowired ZitounaTagRepository tags;
    @Autowired TagTypeDefinitionRepository tagTypes;
    @Autowired ForumAttachmentRepository attachments;
    @MockitoBean JwtDecoder decoder;
    private User owner;
    private ForumPost approved;

    @BeforeEach void seed() {
        owner = account("contributor", "CONTRIBUTOR");
        account("other", "CONTRIBUTOR");
        account("viewer", "VIEWER");
        account("admin", "ADMIN");
        approved = posts.saveAndFlush(ForumPost.builder().author(owner).title("Published title")
                .content("Published content").moderationStatus(ModerationStatus.APPROVED).build());
    }

    private User account(String name, String role) {
        User user = users.saveAndFlush(User.builder().username("approval-" + name).email(name + "@approval.example.test")
                .keycloakId("approval-" + name).passwordHash("external").build());
        when(decoder.decode(name)).thenReturn(Jwt.withTokenValue(name).header("alg", "RS256")
                .subject(user.getKeycloakId()).claim("email", user.getEmail())
                .claim("preferred_username", user.getUsername())
                .claim("realm_access", Map.of("roles", List.of(role))).build());
        return user;
    }

    private RequestPostProcessor as(String token) {
        return request -> { request.addHeader("Authorization", "Bearer " + token); return request; };
    }

    private void edit(String token, String content) throws Exception {
        mvc.perform(put("/api/forum/posts/{id}", approved.getId()).with(as(token))
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Edited title\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").value("Published content"));
        posts.flush();
    }

    private void decision(String token, String decision, long version, int expected) throws Exception {
        mvc.perform(post("/api/admin/moderation/FORUM/{id}/{decision}", approved.getId(), decision)
                .with(as(token)).contentType(MediaType.APPLICATION_JSON).content("{\"version\":" + version + ",\"note\":\"Local review\"}"))
                .andExpect(status().is(expected));
        posts.flush();
    }

    private void publicContent(String content) throws Exception {
        mvc.perform(get("/api/forum/posts/{id}", approved.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value(content));
        mvc.perform(get("/api/forum/posts")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value(content))
                .andExpect(jsonPath("$[0].pendingContent").doesNotExist());
    }

    @Test void anonymousWritesAndModerationAreRejected() throws Exception {
        mvc.perform(post("/api/forum/posts").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Local post\",\"content\":\"Local content\"}")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/forum/posts/{id}", approved.getId()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Bypass\"}")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/forum/posts/{id}", approved.getId())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/moderation")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/moderation/FORUM/{id}/approve", approved.getId())).andExpect(status().isUnauthorized());
    }

    @Test void viewerCannotCreateEditOrDeleteEvenWithForgedOwnershipHeader() throws Exception {
        mvc.perform(post("/api/forum/posts").with(as("viewer")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Local post\",\"content\":\"Local content\"}")).andExpect(status().isForbidden());
        mvc.perform(put("/api/forum/posts/{id}", approved.getId()).with(as("viewer"))
                .header("X-User-Id", owner.getId()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Bypass\"}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/forum/posts/{id}", approved.getId()).with(as("viewer"))).andExpect(status().isForbidden());
        publicContent("Published content");
    }

    @Test void contributorCanCreateButNewContentIsNotPublic() throws Exception {
        mvc.perform(post("/api/forum/posts").with(as("contributor")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Local new post\",\"content\":\"Submitted content\",\"moderationStatus\":\"APPROVED\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.moderationStatus").value("PENDING"));
        ForumPost pending = posts.findAll().stream().filter(p -> p.getTitle().equals("Local new post")).findFirst().orElseThrow();
        mvc.perform(get("/api/forum/posts/{id}", pending.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/api/forum/posts")).andExpect(jsonPath("$.length()").value(1));
    }

    @Test void contributorCannotChangeOthersPostsOrApproveEdits() throws Exception {
        mvc.perform(put("/api/forum/posts/{id}", approved.getId()).with(as("other"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Other content\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/forum/posts/{id}", approved.getId()).with(as("other"))).andExpect(status().isForbidden());
        decision("contributor", "approve", approved.getVersion(), 403);
        mvc.perform(get("/api/admin/moderation").with(as("contributor"))).andExpect(status().isForbidden());
    }

    @Test void contributorCanDeleteOwnPostAndItsReplies() throws Exception {
        replies.saveAndFlush(ForumReply.builder().post(approved).author(owner).content("Preserved until deletion").build());
        mvc.perform(delete("/api/forum/posts/{id}", approved.getId()).with(as("contributor"))).andExpect(status().isNoContent());
        posts.flush();
        assertThat(posts.existsById(approved.getId())).isFalse();
        assertThat(replies.findByPost_Id(approved.getId())).isEmpty();
    }

    @Test void adminCanEditAndDeleteAnotherUsersPost() throws Exception {
        edit("admin", "Admin proposed content");
        decision("admin", "approve", approved.getVersion(), 204);
        publicContent("Admin proposed content");
        mvc.perform(delete("/api/forum/posts/{id}", approved.getId()).with(as("admin"))).andExpect(status().isNoContent());
    }

    @Test void contributorEditStaysPrivateUntilAdminReviewsAndApprovesIt() throws Exception {
        TagTypeDefinition type = tagTypes.saveAndFlush(TagTypeDefinition.builder().name("Approval topic")
                .field(TagField.TOPIC).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        ZitounaTag tag = tags.saveAndFlush(ZitounaTag.builder().name("Preserved tag").normalizedName("preserved-tag").type(type)
                .status(TagStatus.APPROVED).build());
        approved.setTags(new java.util.HashSet<>(Set.of(tag)));
        posts.saveAndFlush(approved);
        Long replyId = replies.saveAndFlush(ForumReply.builder().post(approved).author(owner).content("Existing reply").build()).getId();
        Long attachmentId = attachments.saveAndFlush(ForumAttachment.builder().post(approved).author(owner)
                .originalFilename("local.pdf").storedFilename("local-test-only.pdf").mimeType("application/pdf")
                .type(ForumAttachmentType.PDF).sizeBytes(10L).build()).getId();
        edit("contributor", "Private proposed content");
        publicContent("Published content");
        mvc.perform(get("/api/zitouna/feed")).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + approved.getId() + ")].excerpt")
                        .value(org.hamcrest.Matchers.contains("Published content")));
        mvc.perform(get("/api/admin/moderation").with(as("admin"))).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Edited title"))
                .andExpect(jsonPath("$[0].details.content").value("Private proposed content"))
                .andExpect(jsonPath("$[0].details.publishedContent").value("Published content"));
        decision("admin", "approve", approved.getVersion(), 204);
        publicContent("Private proposed content");
        ForumPost saved = posts.findById(approved.getId()).orElseThrow();
        assertThat(saved.getAuthor().getId()).isEqualTo(owner.getId());
        assertThat(saved.getTags()).extracting(ZitounaTag::getId).containsExactly(tag.getId());
        assertThat(replies.findById(replyId)).isPresent();
        assertThat(attachments.findById(attachmentId)).isPresent();
        assertThat(saved.getPendingContent()).isNull();
        assertThat(saved.getRevisionStatus()).isNull();
    }

    @Test void rejectionAndNeedsFixingNeverPublishTheRevisionAndAllowResubmission() throws Exception {
        edit("contributor", "Rejected proposed content");
        decision("admin", "reject", approved.getVersion(), 204);
        publicContent("Published content");
        edit("contributor", "Needs fixing content");
        decision("admin", "needs-fixing", approved.getVersion(), 204);
        publicContent("Published content");
        assertThat(approved.getRevisionStatus()).isEqualTo(ModerationStatus.NEEDS_FIXING);
        edit("contributor", "Corrected content");
        decision("admin", "approve", approved.getVersion(), 204);
        publicContent("Corrected content");
    }

    @Test void staleOrMissingReviewVersionCannotApproveNewerEdits() throws Exception {
        edit("contributor", "First proposal");
        long reviewedVersion = approved.getVersion();
        edit("contributor", "Unreviewed newer proposal");
        decision("admin", "approve", reviewedVersion, 409);
        mvc.perform(post("/api/admin/moderation/FORUM/{id}/approve", approved.getId()).with(as("admin")))
                .andExpect(status().isConflict());
        publicContent("Published content");
    }

    @Test void partialResubmissionPreservesTheOtherProposedField() throws Exception {
        edit("contributor", "Proposed content");
        mvc.perform(put("/api/forum/posts/{id}", approved.getId()).with(as("contributor"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Revised proposal\"}"))
                .andExpect(status().isOk());
        posts.flush();
        assertThat(approved.getPendingTitle()).isEqualTo("Edited title");
        decision("admin", "approve", approved.getVersion(), 204);
        publicContent("Revised proposal");
    }

    @Test void editingAnUnpublishedPostStillRequiresApproval() throws Exception {
        approved.setModerationStatus(ModerationStatus.REJECTED);
        posts.saveAndFlush(approved);
        mvc.perform(put("/api/forum/posts/{id}", approved.getId()).with(as("contributor"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Corrected first submission\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.moderationStatus").value("PENDING"));
        posts.flush();
        mvc.perform(get("/api/forum/posts/{id}", approved.getId())).andExpect(status().isNotFound());
        decision("admin", "needs-fixing", approved.getVersion(), 204);
        mvc.perform(get("/api/forum/posts/{id}", approved.getId())).andExpect(status().isNotFound());
        decision("admin", "reject", approved.getVersion(), 204);
        mvc.perform(get("/api/forum/posts/{id}", approved.getId())).andExpect(status().isNotFound());
        decision("admin", "approve", approved.getVersion(), 204);
        publicContent("Corrected first submission");
    }
}

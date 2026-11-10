package com.studywebsite.zitouna;

import com.studywebsite.model.*;
import com.studywebsite.repository.*;
import com.studywebsite.support.TestAuth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies that when a post/material is accepted in the admin panel,
 * any proposed tags attached to that content are automatically approved.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProposedTagAutoApprovalTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResourceRepository resources;
    @Autowired ForumPostRepository posts;
    @Autowired RoadmapRepository roadmaps;
    @Autowired TagTypeDefinitionRepository types;
    @Autowired ZitounaTagRepository tagRepo;
    @MockitoBean JwtDecoder decoder;

    @Test
    void approvingLearningMaterialAutoApprovesProposedTags() throws Exception {
        User author = users.saveAndFlush(User.builder().username("material-author")
                .email("material-author@example.test").passwordHash("external").build());

        var instType = types.saveAndFlush(TagTypeDefinition.builder().name("Institution type A")
                .field(TagField.INSTITUTION).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        var approvedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("Approved Uni A")
                .normalizedName("approved-uni-a").type(instType).status(TagStatus.APPROVED).build());

        var topicType = types.saveAndFlush(TagTypeDefinition.builder().name("Topic type A")
                .field(TagField.TOPIC).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        ZitounaTag proposedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("New Topic A")
                .normalizedName("new-topic-a").type(topicType).status(TagStatus.PROPOSED).build());

        Resource material = Resource.builder()
                .author(author)
                .title("Proposed tag material")
                .description("Test material")
                .type(ResourceType.PDF)
                .moderationStatus(ModerationStatus.PENDING)
                .tags(new HashSet<>(List.of(approvedTag, proposedTag)))
                .build();
        resources.saveAndFlush(material);
        tagRepo.flush();

        assertThat(proposedTag.getStatus()).isEqualTo(TagStatus.PROPOSED);

        // Approve the material via admin moderation
        mvc.perform(post("/api/admin/moderation/LEARNING_MATERIAL/" + material.getId() + "/approve")
                        .with(TestAuth.admin(author.getId()))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isNoContent());

        tagRepo.flush();

        // The proposed tag should now be APPROVED
        ZitounaTag updatedTag = tagRepo.findById(proposedTag.getId()).orElseThrow();
        assertThat(updatedTag.getStatus()).isEqualTo(TagStatus.APPROVED);
    }

    @Test
    void rejectingLearningMaterialDoesNotAutoApproveProposedTags() throws Exception {
        User author = users.saveAndFlush(User.builder().username("reject-author")
                .email("reject-author@example.test").passwordHash("external").build());

        var instType = types.saveAndFlush(TagTypeDefinition.builder().name("Institution type B")
                .field(TagField.INSTITUTION).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        var approvedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("Approved Uni B")
                .normalizedName("approved-uni-b").type(instType).status(TagStatus.APPROVED).build());

        var topicType = types.saveAndFlush(TagTypeDefinition.builder().name("Topic type B")
                .field(TagField.TOPIC).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        ZitounaTag proposedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("Rejected Topic B")
                .normalizedName("rejected-topic-b").type(topicType).status(TagStatus.PROPOSED).build());

        Resource material = Resource.builder()
                .author(author)
                .title("Rejected material")
                .description("Will be rejected")
                .type(ResourceType.PDF)
                .moderationStatus(ModerationStatus.PENDING)
                .tags(new HashSet<>(List.of(approvedTag, proposedTag)))
                .build();
        resources.saveAndFlush(material);
        tagRepo.flush();

        assertThat(proposedTag.getStatus()).isEqualTo(TagStatus.PROPOSED);

        // Reject the material
        mvc.perform(post("/api/admin/moderation/LEARNING_MATERIAL/" + material.getId() + "/reject")
                        .with(TestAuth.admin(author.getId()))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isNoContent());

        tagRepo.flush();

        // The proposed tag should remain PROPOSED (not auto-approved)
        ZitounaTag updatedTag = tagRepo.findById(proposedTag.getId()).orElseThrow();
        assertThat(updatedTag.getStatus()).isEqualTo(TagStatus.PROPOSED);
    }

    @Test
    void approvingForumPostAutoApprovesProposedTags() throws Exception {
        User author = users.saveAndFlush(User.builder().username("forum-author")
                .email("forum-author@example.test").passwordHash("external").build());

        var instType = types.saveAndFlush(TagTypeDefinition.builder().name("Institution type C")
                .field(TagField.INSTITUTION).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        var approvedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("Approved Uni C")
                .normalizedName("approved-uni-c").type(instType).status(TagStatus.APPROVED).build());

        // Create a forum post with a proposed tag
        ForumPost post = ForumPost.builder()
                .author(author)
                .title("Forum with proposed tag")
                .content("Content with a proposed tag")
                .moderationStatus(ModerationStatus.PENDING)
                .tags(new HashSet<>(List.of(approvedTag)))
                .build();

        // Create a proposed tag and attach it
        var topicType = types.saveAndFlush(TagTypeDefinition.builder().name("Topic type C")
                .field(TagField.TOPIC).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        ZitounaTag proposedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("Forum Proposed Tag C")
                .normalizedName("forum-proposed-tag-c").type(topicType).status(TagStatus.PROPOSED).build());
        post.getTags().add(proposedTag);
        post = posts.saveAndFlush(post);

        // Approve the forum post
        mvc.perform(post("/api/admin/moderation/FORUM/" + post.getId() + "/approve")
                        .with(TestAuth.admin(author.getId()))
                        .contentType("application/json")
                        .content("{\"version\":" + post.getVersion() + "}"))
                .andExpect(status().isNoContent());

        tagRepo.flush();

        // The proposed tag should now be APPROVED
        ZitounaTag updatedTag = tagRepo.findById(proposedTag.getId()).orElseThrow();
        assertThat(updatedTag.getStatus()).isEqualTo(TagStatus.APPROVED);
    }

    @Test
    void approvingRoadmapAutoApprovesProposedTags() throws Exception {
        User author = users.saveAndFlush(User.builder().username("roadmap-author")
                .email("roadmap-author@example.test").passwordHash("external").build());

        var instType = types.saveAndFlush(TagTypeDefinition.builder().name("Institution type D")
                .field(TagField.INSTITUTION).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        var approvedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("Approved Uni D")
                .normalizedName("approved-uni-d").type(instType).status(TagStatus.APPROVED).build());

        var topicType = types.saveAndFlush(TagTypeDefinition.builder().name("Topic type D")
                .field(TagField.TOPIC).active(true).minimumInstitutions(0).minimumPrograms(0).build());
        ZitounaTag proposedTag = tagRepo.saveAndFlush(ZitounaTag.builder().name("Roadmap Proposed Tag D")
                .normalizedName("roadmap-proposed-tag-d").type(topicType).status(TagStatus.PROPOSED).build());

        Roadmap roadmap = Roadmap.builder()
                .author(author)
                .title("Roadmap with proposed tag")
                .description("A roadmap with a proposed tag")
                .moderationStatus(ModerationStatus.PENDING)
                .tags(new HashSet<>(List.of(approvedTag, proposedTag)))
                .build();
        roadmaps.saveAndFlush(roadmap);

        // Approve the roadmap
        mvc.perform(post("/api/admin/moderation/ROADMAP/" + roadmap.getId() + "/approve")
                        .with(TestAuth.admin(author.getId()))
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isNoContent());

        tagRepo.flush();

        // The proposed tag should now be APPROVED
        ZitounaTag updatedTag = tagRepo.findById(proposedTag.getId()).orElseThrow();
        assertThat(updatedTag.getStatus()).isEqualTo(TagStatus.APPROVED);
    }
}

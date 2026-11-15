package com.studywebsite.controller;

import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.User;
import com.studywebsite.repository.RoadmapRepository;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.dto.zitouna.ZitounaDtos;
import com.studywebsite.model.TagField;
import com.studywebsite.model.TagStatus;
import com.studywebsite.model.ZitounaTag;
import com.studywebsite.repository.ZitounaTagRepository;
import com.studywebsite.service.TagService;
import com.studywebsite.service.admin.KeycloakAdminClient;
import com.studywebsite.support.TestAuth;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:queueeditdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "spring.docker.compose.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class AdminQueueEditTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoadmapRepository roadmapRepository;
    @Autowired private ZitounaTagRepository tagRepository;
    @Autowired private TagService tagService;
    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private KeycloakAdminClient keycloakAdminClient;

    private Long adminId;
    private Long authorId;
    private Long roadmapId;

    @BeforeEach
    void setUp() {
        adminId = createUser("qe.admin");
        authorId = createUser("qe.author");
        Roadmap roadmap = new Roadmap();
        roadmap.setTitle("Queued");
        roadmap.setAuthor(userRepository.findById(authorId).orElseThrow());
        roadmap.setModerationStatus(ModerationStatus.PENDING);
        roadmapId = roadmapRepository.saveAndFlush(roadmap).getId();
    }

    @Test
    void nonAdminsCannotEditQueuedContent() throws Exception {
        mockMvc.perform(put("/api/admin/moderation/ROADMAP/{id}", roadmapId)
                        .with(TestAuth.contributor(authorId))
                        .contentType(MediaType.APPLICATION_JSON).content(body(tagId("TUM"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void validEditUpdatesContentAndTagsButKeepsStatus() throws Exception {
        mockMvc.perform(put("/api/admin/moderation/ROADMAP/{id}", roadmapId)
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content(body(tagId("TUM"))))
                .andExpect(status().isNoContent());
        Roadmap saved = roadmapRepository.findByIdWithTags(roadmapId).orElseThrow();
        assertEquals("Edited", saved.getTitle());
        assertEquals(1, saved.getTags().size());
        assertEquals(ModerationStatus.PENDING, saved.getModerationStatus());
    }

    @Test
    void tagCombinationRulesAreEnforcedOnTheBackend() throws Exception {
        // "Exchange program" requires two institutions; none are selected.
        mockMvc.perform(put("/api/admin/moderation/ROADMAP/{id}", roadmapId)
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content(body(tagId("Exchange program"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("institution")));
    }

    @Test
    void approvedContentCannotBeEditedThroughTheQueueEndpoint() throws Exception {
        Roadmap roadmap = roadmapRepository.findById(roadmapId).orElseThrow();
        roadmap.setModerationStatus(ModerationStatus.APPROVED);
        roadmapRepository.saveAndFlush(roadmap);
        mockMvc.perform(put("/api/admin/moderation/ROADMAP/{id}", roadmapId)
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content(body(tagId("TUM"))))
                .andExpect(status().isConflict());
    }

    @Test
    void rejectingAProposedTagRemovesItFromQueuedContentAndBlocksAcceptingInvalidTags() throws Exception {
        Long proposed = tagService.propose(new ZitounaDtos.TagProposalRequest("Test Institute", TagField.INSTITUTION, null), authorId).id();
        Roadmap roadmap = roadmapRepository.findById(roadmapId).orElseThrow();
        // "Exchange program" needs two institutions: TUM + the proposed one satisfy it, until the proposal is rejected
        roadmap.getTags().addAll(java.util.List.of(tagRepository.findById(tagId("TUM")).orElseThrow(),
                tagRepository.findById(tagId("Exchange program")).orElseThrow(), tagRepository.findById(proposed).orElseThrow()));
        roadmapRepository.saveAndFlush(roadmap);

        mockMvc.perform(post("/api/admin/tags/{id}/reject", proposed).with(TestAuth.admin(adminId)))
                .andExpect(status().isOk());
        assertEquals(2, roadmapRepository.findByIdWithTags(roadmapId).orElseThrow().getTags().size());
        mockMvc.perform(post("/api/admin/moderation/ROADMAP/{id}/approve", roadmapId)
                        .with(TestAuth.admin(adminId)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void mergingTagsRepointsQueuedAndPublishedContentWithoutDuplicates() throws Exception {
        Long a = tagService.propose(new ZitounaDtos.TagProposalRequest("Java Script", TagField.TOPIC, null), authorId).id();
        Long b = tagService.propose(new ZitounaDtos.TagProposalRequest("Javascript", TagField.TOPIC, null), authorId).id();
        Roadmap queued = roadmapRepository.findById(roadmapId).orElseThrow();
        queued.getTags().add(tagRepository.findById(a).orElseThrow());
        queued.getTags().add(tagRepository.findById(b).orElseThrow());
        Roadmap published = new Roadmap();
        published.setTitle("Published");
        published.setAuthor(queued.getAuthor());
        published.setModerationStatus(ModerationStatus.APPROVED);
        published.getTags().add(tagRepository.findById(b).orElseThrow());
        roadmapRepository.saveAndFlush(queued);
        Long publishedId = roadmapRepository.saveAndFlush(published).getId();

        Long typeId = tagRepository.findById(a).orElseThrow().getType().getId();
        String mergeBody = "{\"ids\":[" + a + "," + b + "],\"name\":\"JavaScript\",\"typeId\":" + typeId + ",\"field\":\"TOPIC\"}";
        mockMvc.perform(post("/api/admin/tags/merge").with(TestAuth.contributor(authorId))
                        .contentType(MediaType.APPLICATION_JSON).content(mergeBody))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/tags/merge").with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content(mergeBody))
                .andExpect(status().isOk());

        for (Long id : java.util.List.of(roadmapId, publishedId)) {
            var tags = roadmapRepository.findByIdWithTags(id).orElseThrow().getTags();
            assertEquals(1, tags.size());
            assertEquals("JavaScript", tags.iterator().next().getName());
        }
        ZitounaTag away = tagRepository.findById(a).orElseThrow();
        assertEquals(TagStatus.REJECTED, away.getStatus());
    }

    private String body(Long tagId) {
        String field = tagRepository.findById(tagId).orElseThrow().getType().getField().name();
        String key = switch (field) {
            case "INSTITUTION" -> "institutionIds";
            case "PROGRAM" -> "programIds";
            default -> "topicIds";
        };
        return "{\"title\":\"Edited\",\"description\":\"d\",\"tagSelection\":{\"" + key + "\":[" + tagId + "]}}";
    }

    private Long tagId(String name) {
        return tagRepository.findByNormalizedNameAndParentIsNull(name.toLowerCase()).orElseThrow().getId();
    }

    private Long createUser(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("external");
        user.setKeycloakId("kc-" + username);
        user.setBanned(false);
        return userRepository.saveAndFlush(user).getId();
    }
}

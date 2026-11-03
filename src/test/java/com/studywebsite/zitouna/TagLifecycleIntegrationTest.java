package com.studywebsite.zitouna;

import com.studywebsite.model.TagField;
import com.studywebsite.model.TagStatus;
import com.studywebsite.model.TagTypeDefinition;
import com.studywebsite.model.User;
import com.studywebsite.repository.TagTypeDefinitionRepository;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.ZitounaTagRepository;
import com.studywebsite.support.TestAuth;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:taglifecycledb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.sql.init.mode=never",
        "spring.docker.compose.enabled=false"
})
@AutoConfigureMockMvc
class TagLifecycleIntegrationTest {
    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private TagTypeDefinitionRepository types;
    @Autowired private ZitounaTagRepository tags;
    @MockitoBean private JwtDecoder jwtDecoder;
    @TempDir static Path storage;

    @DynamicPropertySource
    static void configureStorage(DynamicPropertyRegistry properties) {
        properties.add("app.upload.material-directory", storage::toString);
    }

    @Test
    void onlyAdminsCanCreateApprovedTagsAndDuplicateNamesAreRejected() throws Exception {
        User author = user("tag.create.author");
        User admin = user("tag.create.admin");
        TagTypeDefinition topicType = type(TagField.TOPIC);
        String payload = """
                {"name":"Admin-created topic","typeId":%d}
                """.formatted(topicType.getId());

        mvc.perform(post("/api/admin/tags").with(TestAuth.contributor(author.getId()))
                        .contentType("application/json").content(payload))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/admin/tags").with(TestAuth.admin(admin.getId()))
                        .contentType("application/json").content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Admin-created topic"))
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mvc.perform(post("/api/admin/tags").with(TestAuth.admin(admin.getId()))
                        .contentType("application/json").content(payload))
                .andExpect(status().isBadRequest());

        var rejected = tags.findByNormalizedNameAndParentIsNull("admin-created topic").orElseThrow();
        rejected.setStatus(TagStatus.REJECTED);
        tags.saveAndFlush(rejected);
        mvc.perform(post("/api/forum/posts").with(TestAuth.contributor(author.getId()))
                        .contentType("application/json")
                        .content("""
                                {"title":"Rejected tag proposal","content":"A post cannot reuse a rejected tag.",
                                 "tagSelection":{"proposals":[{"name":"Admin-created topic","field":"TOPIC"}]}}
                                """))
                .andExpect(status().isBadRequest());

        TagTypeDefinition subtopicType = type(TagField.SUBTOPIC);
        long approvedTopicId = tags.findByNormalizedNameAndParentIsNull("analysis 1").orElseThrow().getId();
        mvc.perform(post("/api/admin/tags").with(TestAuth.admin(admin.getId()))
                        .contentType("application/json")
                        .content("""
                                {"name":"Admin-created subtopic","typeId":%d,"parentId":%d}
                                """.formatted(subtopicType.getId(), approvedTopicId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.parentId").value(approvedTopicId));

        long institutionId = tags.findByNormalizedNameAndParentIsNull("tum").orElseThrow().getId();
        mvc.perform(post("/api/admin/tags").with(TestAuth.admin(admin.getId()))
                        .contentType("application/json")
                        .content("""
                                {"name":"Invalid child","typeId":%d,"parentId":%d}
                                """.formatted(topicType.getId(), institutionId)))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/tags/proposals").with(TestAuth.contributor(author.getId()))
                        .contentType("application/json")
                        .content("{\"name\":\"Standalone proposal\",\"field\":\"TOPIC\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void proposalsAreCreatedThroughForumMaterialsAndRoadmapSubmissions() throws Exception {
        User author = user("tag.proposals.author");
        RequestPostProcessor contributor = TestAuth.contributor(author.getId());

        mvc.perform(post("/api/forum/posts").with(contributor)
                        .contentType("application/json")
                        .content("""
                                {"title":"Proposal forum post","content":"A post with a proposed tag.",
                                 "tagSelection":{"proposals":[{"name":"Forum proposal","field":"TOPIC"}]}}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags").value(org.hamcrest.Matchers.hasItem("Forum proposal")));

        mvc.perform(post("/api/roadmaps").with(contributor)
                        .contentType("application/json")
                        .content("""
                                {"title":"Proposal roadmap",
                                 "tagSelection":{"proposals":[{"name":"Roadmap proposal","field":"PROGRAM"}]}}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags").value(org.hamcrest.Matchers.hasItem("Roadmap proposal")));

        MockMultipartFile payload = new MockMultipartFile("payload", "", "application/json", """
                {"title":"Proposal material","type":"PDF",
                 "tags":{"proposals":[{"name":"Material proposal","field":"INSTITUTION"}]}}
                """.getBytes(StandardCharsets.UTF_8));
        MockMultipartFile file = new MockMultipartFile("file", "notes.pdf", "application/pdf",
                "%PDF-1.4 tag proposal test".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/learning-materials").file(payload).file(file).with(contributor))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tags[0].name").value("Material proposal"));

        mvc.perform(get("/api/admin/tags/proposals").with(TestAuth.admin(user("tag.proposals.admin").getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.containsInAnyOrder(
                        "Forum proposal", "Roadmap proposal", "Material proposal")));
        assertThat(tags.findByNormalizedNameAndParentIsNull("forum proposal").orElseThrow().getStatus())
                .isEqualTo(TagStatus.PROPOSED);
    }

    @Test
    void proposalRollsBackWhenTheContentTagSelectionIsInvalid() throws Exception {
        User author = user("tag.proposals.rollback");
        Long courseTagId = tags.findByNormalizedNameAndParentIsNull("analysis 1").orElseThrow().getId();

        mvc.perform(post("/api/forum/posts").with(TestAuth.contributor(author.getId()))
                        .contentType("application/json")
                        .content("""
                                {"title":"Invalid proposal post","content":"Missing required course tags.",
                                 "tagSelection":{"topicIds":[%d],
                                   "proposals":[{"name":"Should roll back","field":"TOPIC"}]}}
                                """.formatted(courseTagId)))
                .andExpect(status().isBadRequest());

        assertThat(tags.findByNormalizedNameAndParentIsNull("should roll back")).isEmpty();
    }

    private User user(String username) {
        return users.saveAndFlush(User.builder()
                .username(username)
                .email(username + "@example.test")
                .passwordHash("external")
                .build());
    }

    private TagTypeDefinition type(TagField field) {
        return types.findByFieldAndActiveTrueOrderByNameAsc(field).get(0);
    }
}
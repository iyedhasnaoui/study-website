package com.studywebsite.zitouna;

import com.studywebsite.model.User;
import com.studywebsite.model.TagField;
import com.studywebsite.model.TagStatus;
import com.studywebsite.model.TagTypeDefinition;
import com.studywebsite.model.ZitounaTag;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.TagTypeDefinitionRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.nio.charset.StandardCharsets;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MaterialModerationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired TagTypeDefinitionRepository types;
    @Autowired ZitounaTagRepository tags;
    @MockitoBean JwtDecoder decoder;
    @TempDir static Path storage;

    @DynamicPropertySource
    static void configureStorage(DynamicPropertyRegistry properties) {
        properties.add("app.upload.material-directory", storage::toString);
    }

    @Test
    void submittedDescriptionAndMetadataReachTheAdminQueueOnly() throws Exception {
        User author = users.saveAndFlush(User.builder().username("material-review")
                .email("material-review@example.test").passwordHash("external").build());
        var type = types.saveAndFlush(TagTypeDefinition.builder().name("Material institution").field(TagField.INSTITUTION)
                .active(true).minimumInstitutions(0).minimumPrograms(0).build());
        var tag = tags.saveAndFlush(ZitounaTag.builder().name("Review campus").normalizedName("review-campus")
                .type(type).status(TagStatus.APPROVED).build());
        var payload = new MockMultipartFile("payload", "", "application/json", """
                {"title":"Local notes","description":"A useful material description.","type":"PDF",
                 "tags":{"institutionIds":[%d]}}
                """.formatted(tag.getId()).getBytes(StandardCharsets.UTF_8));
        var file = new MockMultipartFile("file", "notes.pdf", "application/pdf",
                "%PDF-1.4 local test".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/learning-materials").file(payload).file(file)
                        .with(TestAuth.contributor(author.getId())))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/admin/moderation")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/moderation").with(TestAuth.viewer(author.getId())))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/moderation").with(TestAuth.admin(author.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == 'Local notes')].details.description")
                        .value(org.hamcrest.Matchers.contains("A useful material description.")))
                .andExpect(jsonPath("$[?(@.title == 'Local notes')].details.type")
                        .value(org.hamcrest.Matchers.contains("PDF")))
                .andExpect(jsonPath("$[?(@.title == 'Local notes')].authorUsername")
                        .value(org.hamcrest.Matchers.contains("material-review")))
                .andExpect(jsonPath("$[?(@.title == 'Local notes')].details.filename")
                        .value(org.hamcrest.Matchers.contains("notes.pdf")))
                .andExpect(jsonPath("$[?(@.title == 'Local notes')].details.tags[0]")
                        .value(org.hamcrest.Matchers.contains("Review campus")))
                .andExpect(jsonPath("$[0].submittedAt").exists());
        mvc.perform(get("/api/learning-materials")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}

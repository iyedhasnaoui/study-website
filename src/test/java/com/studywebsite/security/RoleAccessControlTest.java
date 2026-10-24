package com.studywebsite.security;

import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.User;
import com.studywebsite.repository.RoadmapRepository;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.service.admin.KeycloakAdminClient;
import com.studywebsite.support.TestAuth;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Each role against each protected action. These run against the real security configuration, so
 * they fail if a rule is only enforced in the user interface.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:rbacdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "spring.docker.compose.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class RoleAccessControlTest {

    private static final String ROADMAP_JSON = """
            {"title":"A plan","description":"made in a test"}""";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoadmapRepository roadmapRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private KeycloakAdminClient keycloakAdminClient;

    private Long viewerId;
    private Long contributorId;
    private Long adminId;

    @BeforeEach
    void setUp() {
        viewerId = createUser("rbac.viewer");
        contributorId = createUser("rbac.contributor");
        adminId = createUser("rbac.admin");
    }

    // --- reading -------------------------------------------------------------

    @ParameterizedTest
    @EnumSource(AppRole.class)
    void everyRoleMayBrowseRoadmaps(AppRole role) throws Exception {
        mockMvc.perform(get("/api/roadmaps").with(authFor(role)))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousVisitorsMayBrowseRoadmaps() throws Exception {
        mockMvc.perform(get("/api/roadmaps")).andExpect(status().isOk());
    }

    // --- creating ------------------------------------------------------------

    @Test
    void viewerCannotCreateARoadmap() throws Exception {
        mockMvc.perform(post("/api/roadmaps")
                        .with(TestAuth.viewer(viewerId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ROADMAP_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void contributorAndAdminMayCreateARoadmap() throws Exception {
        mockMvc.perform(post("/api/roadmaps")
                        .with(TestAuth.contributor(contributorId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ROADMAP_JSON))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/roadmaps")
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ROADMAP_JSON))
                .andExpect(status().isCreated());
    }

    @Test
    void anonymousVisitorsCannotCreateARoadmap() throws Exception {
        mockMvc.perform(post("/api/roadmaps")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ROADMAP_JSON))
                .andExpect(status().isUnauthorized());
    }

    // --- editing -------------------------------------------------------------

    @Test
    void onlyTheAuthorOrAnAdminMayEditARoadmap() throws Exception {
        Long roadmapId = seedRoadmap(contributorId);
        String body = """
                {"title":"Renamed"}""";

        mockMvc.perform(put("/api/roadmaps/{id}", roadmapId)
                        .with(TestAuth.viewer(viewerId))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());

        Long otherContributor = createUser("rbac.other");
        mockMvc.perform(put("/api/roadmaps/{id}", roadmapId)
                        .with(TestAuth.contributor(otherContributor))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/roadmaps/{id}", roadmapId)
                        .with(TestAuth.contributor(contributorId))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/roadmaps/{id}", roadmapId)
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
    }

    // --- deleting ------------------------------------------------------------

    @Test
    void onlyAdminMayDeleteARoadmapEvenItsAuthor() throws Exception {
        Long roadmapId = seedRoadmap(contributorId);

        mockMvc.perform(delete("/api/roadmaps/{id}", roadmapId).with(TestAuth.viewer(viewerId)))
                .andExpect(status().isForbidden());

        // The contributor owns this roadmap and still may not delete it.
        mockMvc.perform(delete("/api/roadmaps/{id}", roadmapId).with(TestAuth.contributor(contributorId)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/roadmaps/{id}", roadmapId).with(TestAuth.admin(adminId)))
                .andExpect(status().isNoContent());
    }

    // --- user management -----------------------------------------------------

    @Test
    void onlyAdminReachesUserManagement() throws Exception {
        when(keycloakAdminClient.listUsers()).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/users").with(TestAuth.viewer(viewerId)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/users").with(TestAuth.contributor(contributorId)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/users").with(TestAuth.admin(adminId)))
                .andExpect(status().isOk());
    }

    @Test
    void adminMayPromoteAndDemoteBetweenViewerAndContributor() throws Exception {
        stubKeycloakUser("kc-target", AppRole.VIEWER);

        mockMvc.perform(put("/api/admin/users/{id}/role", "kc-target")
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"CONTRIBUTOR\"}"))
                .andExpect(status().isNoContent());
        verify(keycloakAdminClient).replaceRole("kc-target", AppRole.CONTRIBUTOR);

        mockMvc.perform(put("/api/admin/users/{id}/role", "kc-target")
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"VIEWER\"}"))
                .andExpect(status().isNoContent());
        verify(keycloakAdminClient).replaceRole("kc-target", AppRole.VIEWER);
    }

    // --- ADMIN is fixed ------------------------------------------------------

    @Test
    void nobodyMayGrantAdminThroughTheApi() throws Exception {
        stubKeycloakUser("kc-target", AppRole.VIEWER);

        mockMvc.perform(put("/api/admin/users/{id}/role", "kc-target")
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("cannot be granted")));

        verify(keycloakAdminClient, never()).replaceRole(anyString(), any());
    }

    @Test
    void anExistingAdminCannotBeDemotedRemovedOrBanned() throws Exception {
        stubKeycloakUser("kc-boss", AppRole.ADMIN);

        mockMvc.perform(put("/api/admin/users/{id}/role", "kc-boss")
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"VIEWER\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/admin/users/{id}", "kc-boss").with(TestAuth.admin(adminId)))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/admin/users/{id}/ban", "kc-boss")
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"banned\":true}"))
                .andExpect(status().isForbidden());

        verify(keycloakAdminClient, never()).replaceRole(anyString(), any());
        verify(keycloakAdminClient, never()).deleteUser(anyString());
        verify(keycloakAdminClient, never()).setEnabled(anyString(), org.mockito.ArgumentMatchers.anyBoolean());
    }

    @Test
    void anAdminCannotEvenDemoteTheirOwnAccount() throws Exception {
        stubKeycloakUser("kc-self", AppRole.ADMIN);

        mockMvc.perform(put("/api/admin/users/{id}/role", "kc-self")
                        .with(TestAuth.admin(adminId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"CONTRIBUTOR\"}"))
                .andExpect(status().isForbidden());

        verify(keycloakAdminClient, never()).replaceRole(anyString(), any());
    }

    // --- sessions ------------------------------------------------------------

    @Test
    void adminMayEndAnotherUsersSessions() throws Exception {
        stubKeycloakUser("kc-target", AppRole.CONTRIBUTOR);

        mockMvc.perform(post("/api/admin/users/{id}/logout", "kc-target")
                        .with(TestAuth.contributor(contributorId)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/users/{id}/logout", "kc-target")
                        .with(TestAuth.admin(adminId)))
                .andExpect(status().isNoContent());
        verify(keycloakAdminClient).endSessions("kc-target");
    }

    // --- helpers -------------------------------------------------------------

    private void stubKeycloakUser(String keycloakId, AppRole role) {
        when(keycloakAdminClient.findUser(keycloakId)).thenReturn(Optional.of(
                new KeycloakAdminClient.KeycloakUser(keycloakId, "target", "t@example.com", true, role)));
        when(keycloakAdminClient.roleOf(keycloakId)).thenReturn(role);
    }

    private RequestPostProcessor authFor(AppRole role) {
        return switch (role) {
            case VIEWER -> TestAuth.viewer(viewerId);
            case CONTRIBUTOR -> TestAuth.contributor(contributorId);
            case ADMIN -> TestAuth.admin(adminId);
        };
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

    private Long seedRoadmap(Long authorId) {
        User author = userRepository.findById(authorId).orElseThrow();
        Roadmap roadmap = new Roadmap();
        roadmap.setTitle("Seeded");
        roadmap.setDescription("seeded for a test");
        roadmap.setAuthor(author);
        roadmap.setModerationStatus(ModerationStatus.APPROVED);
        return roadmapRepository.saveAndFlush(roadmap).getId();
    }
}

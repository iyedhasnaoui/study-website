package com.studywebsite.roadmap;

import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.User;
import com.studywebsite.repository.RoadmapRepository;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.ZitounaTagRepository;
import com.studywebsite.security.AppRole;
import com.studywebsite.support.TestAuth;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:roadmapfeeddb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.sql.init.mode=never",
        "spring.docker.compose.enabled=false"
})
@AutoConfigureMockMvc
class RoadmapFeedIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private RoadmapRepository roadmaps;
    @Autowired private UserRepository users;
    @Autowired private ZitounaTagRepository tags;
    @MockitoBean private JwtDecoder jwtDecoder;

    @Test
    void visibilityIsConsistentAcrossFeedDetailAndGraph() throws Exception {
        User author = user("visibility.author");
        RequestPostProcessor owner = TestAuth.as(author.getId(), AppRole.CONTRIBUTOR);
        RequestPostProcessor other = TestAuth.viewer(user("visibility.other").getId());
        RequestPostProcessor admin = TestAuth.admin(user("visibility.admin").getId());
        long approved = roadmap(author, "visibility approved", ModerationStatus.APPROVED);
        long legacy = roadmap(author, "visibility legacy", null);
        long pending = roadmap(author, "visibility pending", ModerationStatus.PENDING);
        long rejected = roadmap(author, "visibility rejected", ModerationStatus.REJECTED);

        assertVisibility(null, List.of(approved, legacy), List.of(pending, rejected));
        assertVisibility(other, List.of(approved, legacy), List.of(pending, rejected));
        assertVisibility(owner, List.of(approved, legacy, pending, rejected), List.of());
        assertVisibility(admin, List.of(approved, legacy, pending, rejected), List.of());
    }

    @Test
    void selectedTagsSurviveCreationAndAppearInReadsAndFilters() throws Exception {
        RequestPostProcessor owner = TestAuth.contributor(user("tags.author").getId());
        long tum = tagId("tum");
        long singapore = tagId("university of singapore");
        JsonNode created = createTaggedRoadmap(owner, "tagged reads", tum, singapore);
        long id = created.get("id").asLong();
        assertTags(created);
        assertThat(created.get("authorUsername").asText()).isEqualTo("tags.author");
        JsonNode pendingFeed = read(get("/api/roadmaps").with(owner)
                .param("q", "tagged reads").param("tag", "tum"));
        assertThat(ids(pendingFeed)).containsExactly(id);
        assertTags(pendingFeed.get(0));
        assertThat(ids(read(get("/api/roadmaps").param("q", "tagged reads").param("tag", "tum"))))
                .isEmpty();

        Roadmap persisted = roadmaps.findByIdWithTags(id).orElseThrow();
        assertThat(persisted.getTags()).extracting("name")
                .containsExactlyInAnyOrder("TUM", "University of Singapore");
        persisted.setModerationStatus(ModerationStatus.APPROVED);
        roadmaps.saveAndFlush(persisted);

        assertTags(read(get("/api/roadmaps/{id}", id)));
        assertTags(read(get("/api/roadmaps/{id}/graph", id)));
        JsonNode feed = read(get("/api/roadmaps").param("q", "tagged reads"));
        assertThat(feed).hasSize(1);
        assertTags(feed.get(0));
        assertThat(ids(read(get("/api/roadmaps").param("q", "tagged reads").param("tag", "  tUm  "))))
                .containsExactly(id);
        assertThat(ids(read(get("/api/roadmaps").param("q", "tagged reads")
                .param("tagIds", tum + "," + singapore)))).containsExactly(id);
        assertThat(ids(read(get("/api/roadmaps").param("q", "tagged reads")
                .param("tagIds", "999999," + singapore)))).containsExactly(id);
        assertThat(ids(read(get("/api/roadmaps").param("q", "tagged reads").param("tag", "missing"))))
                .isEmpty();
        assertThat(ids(read(get("/api/roadmaps").param("q", "tagged reads").param("tagIds", "999999"))))
                .isEmpty();
    }

    @Test
    void taggedEditAndGraphSaveResponsesWorkWithoutOpenInView() throws Exception {
        RequestPostProcessor owner = TestAuth.contributor(user("tags.editor").getId());
        JsonNode created = createTaggedRoadmap(owner, "tagged edit", tagId("tum"), tagId("university of singapore"));
        long id = created.get("id").asLong();
        long rootId = created.get("nodes").get(0).get("id").asLong();

        JsonNode savedGraph = read(put("/api/roadmaps/{id}/graph", id).with(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nodes":[{"id":%d,"ref":"root","title":"tagged edit","nodeType":"ROOT",
                                   "positionX":0,"positionY":0},
                                  {"ref":"a","title":"Step A","nodeType":"PRIMARY","positionX":0,"positionY":100},
                                  {"ref":"b","title":"Step B","nodeType":"PRIMARY","positionX":0,"positionY":200},
                                  {"ref":"c","title":"Step C","nodeType":"PRIMARY","positionX":0,"positionY":300},
                                  {"ref":"d","title":"Step D","nodeType":"PRIMARY","positionX":0,"positionY":400}],
                         "edges":[{"sourceRef":"root","targetRef":"a"},{"sourceRef":"a","targetRef":"b"},
                                  {"sourceRef":"b","targetRef":"c"},{"sourceRef":"c","targetRef":"d"}]}
                        """.formatted(rootId)));
        assertTags(savedGraph);
        JsonNode updated = read(put("/api/roadmaps/{id}", id).with(owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"edited roadmap\"}"));
        assertTags(updated);
        assertTags(read(get("/api/roadmaps/{id}", id).with(owner)));

        long branchId = 0;
        for (JsonNode node : savedGraph.get("nodes")) {
            if (node.get("title").asText().equals("Step B")) branchId = node.get("id").asLong();
        }
        assertThat(branchId).isPositive();
        String extractedBody = mockMvc.perform(post("/api/roadmaps/{id}/nodes/{nodeId}/extract", id, branchId)
                        .with(owner))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode extracted = objectMapper.readTree(extractedBody);
        assertThat(extracted.get("authorUsername").asText()).isEqualTo("tags.editor");
        assertThat(extracted.get("tags")).isEmpty();
        assertTags(read(get("/api/roadmaps/{id}/graph", id).with(owner)));
    }

    private void assertVisibility(RequestPostProcessor viewer, List<Long> visible, List<Long> hidden) throws Exception {
        MockHttpServletRequestBuilder feed = get("/api/roadmaps").param("q", "visibility ");
        if (viewer != null) feed.with(viewer);
        assertThat(ids(read(feed))).containsExactlyInAnyOrderElementsOf(visible);
        for (Long id : visible) {
            for (String suffix : List.of("", "/graph")) {
                MockHttpServletRequestBuilder request = get("/api/roadmaps/{id}" + suffix, id);
                if (viewer != null) request.with(viewer);
                mockMvc.perform(request).andExpect(status().isOk());
            }
        }
        for (Long id : hidden) {
            for (String suffix : List.of("", "/graph")) {
                MockHttpServletRequestBuilder request = get("/api/roadmaps/{id}" + suffix, id);
                if (viewer != null) request.with(viewer);
                mockMvc.perform(request).andExpect(status().isNotFound());
            }
        }
    }

    private User user(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("external");
        user.setKeycloakId("kc-" + username);
        return users.saveAndFlush(user);
    }

    private long roadmap(User author, String title, ModerationStatus status) {
        Roadmap roadmap = new Roadmap();
        roadmap.setAuthor(author);
        roadmap.setTitle(title);
        roadmap.setModerationStatus(status);
        return roadmaps.saveAndFlush(roadmap).getId();
    }

    private long tagId(String normalizedName) {
        return tags.findByNormalizedNameAndParentIsNull(normalizedName).orElseThrow().getId();
    }

    private JsonNode createTaggedRoadmap(RequestPostProcessor owner, String title, long first, long second) throws Exception {
        String response = mockMvc.perform(post("/api/roadmaps").with(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","tagSelection":{"institutionIds":[%d,%d]}}
                                """.formatted(title, first, second)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    private JsonNode read(MockHttpServletRequestBuilder request) throws Exception {
        return objectMapper.readTree(mockMvc.perform(request).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    private List<Long> ids(JsonNode items) {
        List<Long> ids = new ArrayList<>();
        items.forEach(item -> ids.add(item.get("id").asLong()));
        return ids;
    }

    private void assertTags(JsonNode response) {
        List<String> names = new ArrayList<>();
        response.get("tags").forEach(tag -> names.add(tag.asText()));
        assertThat(names).containsExactly("TUM", "University of Singapore");
    }
}
package com.studywebsite.roadmap;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:roadmapdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "spring.docker.compose.enabled=false"
})
@AutoConfigureMockMvc
@Transactional
class RoadmapGraphIntegrationTest {

    private static final Pattern ACCESS_TOKEN = Pattern.compile("\"accessToken\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void newRoadmapStartsWithASingleMainNode() throws Exception {
        String token = signIn("author.one", "author.one@example.com");
        JsonNode roadmap = createRoadmap(token, "Analysis 1");

        assertThat(roadmap.get("nodes")).hasSize(1);
        assertThat(roadmap.get("nodes").get(0).get("nodeType").asText()).isEqualTo("ROOT");
        assertThat(roadmap.get("nodes").get(0).get("title").asText()).isEqualTo("Analysis 1");
        assertThat(roadmap.get("edges")).isEmpty();
    }

    @Test
    void graphSurvivesAFullEditAndReloadCycle() throws Exception {
        String token = signIn("author.two", "author.two@example.com");
        long roadmapId = createRoadmap(token, "Exchange prep").get("id").asLong();
        long rootId = readGraph(roadmapId).get("nodes").get(0).get("id").asLong();

        // Add two steps, move the main node, and wire a branch that merges back — not a tree.
        String payload = """
                {
                  "nodes": [
                    {"id": %d, "ref": "n%d", "title": "Exchange prep", "nodeType": "ROOT",
                     "positionX": 120.0, "positionY": 40.0},
                    {"ref": "tmp-1", "title": "Pick partner university", "description": "4 weeks",
                     "content": "Compare course catalogues.", "nodeType": "PRIMARY",
                     "positionX": 0.0, "positionY": 220.0},
                    {"ref": "tmp-2", "title": "Motivation letter", "nodeType": "SECONDARY",
                     "positionX": 300.0, "positionY": 220.0}
                  ],
                  "edges": [
                    {"sourceRef": "n%d", "targetRef": "tmp-1"},
                    {"sourceRef": "n%d", "targetRef": "tmp-2"},
                    {"sourceRef": "tmp-1", "targetRef": "tmp-2"}
                  ]
                }
                """.formatted(rootId, rootId, rootId, rootId);

        JsonNode saved = saveGraph(token, roadmapId, payload);
        assertThat(saved.get("nodes")).hasSize(3);
        assertThat(saved.get("edges")).hasSize(3);

        // "tmp-2" is reachable from both the root and "tmp-1": branching plus a merge.
        long letterId = nodeIdByTitle(saved, "Motivation letter");
        assertThat(incomingEdgeCount(saved, letterId)).isEqualTo(2);

        // Reload from scratch: coordinates, categories and connections all come back unchanged.
        JsonNode reloaded = readGraph(roadmapId);
        assertThat(reloaded.get("nodes")).hasSize(3);
        assertThat(reloaded.get("edges")).hasSize(3);

        JsonNode root = nodeById(reloaded, rootId);
        assertThat(root.get("positionX").asDouble()).isEqualTo(120.0);
        assertThat(root.get("positionY").asDouble()).isEqualTo(40.0);

        JsonNode partner = nodeByTitle(reloaded, "Pick partner university");
        assertThat(partner.get("description").asText()).isEqualTo("4 weeks");
        assertThat(partner.get("content").asText()).isEqualTo("Compare course catalogues.");
        assertThat(partner.get("nodeType").asText()).isEqualTo("PRIMARY");
        assertThat(incomingEdgeCount(reloaded, letterId)).isEqualTo(2);

        // Edit one node and delete another; edges of the deleted node go with it.
        long partnerId = partner.get("id").asLong();
        String secondSave = """
                {
                  "nodes": [
                    {"id": %d, "ref": "n%d", "title": "Exchange prep", "nodeType": "ROOT",
                     "positionX": 120.0, "positionY": 40.0},
                    {"id": %d, "ref": "n%d", "title": "Shortlist universities", "nodeType": "PRIMARY",
                     "positionX": 10.0, "positionY": 240.0}
                  ],
                  "edges": [{"sourceRef": "n%d", "targetRef": "n%d"}]
                }
                """.formatted(rootId, rootId, partnerId, partnerId, rootId, partnerId);

        JsonNode afterEdit = saveGraph(token, roadmapId, secondSave);
        assertThat(afterEdit.get("nodes")).hasSize(2);
        assertThat(afterEdit.get("edges")).hasSize(1);
        assertThat(nodeById(afterEdit, partnerId).get("title").asText()).isEqualTo("Shortlist universities");
        assertThat(nodeById(afterEdit, partnerId).get("positionX").asDouble()).isEqualTo(10.0);

        assertThat(readGraph(roadmapId).get("nodes")).hasSize(2);
    }

    @Test
    void graphIsRejectedWithoutExactlyOneMainNodeOrWithSelfLoops() throws Exception {
        String token = signIn("author.three", "author.three@example.com");
        long roadmapId = createRoadmap(token, "Bad graphs").get("id").asLong();
        long rootId = readGraph(roadmapId).get("nodes").get(0).get("id").asLong();

        mockMvc.perform(graphSave(token, roadmapId, """
                        {"nodes": [{"ref": "a", "title": "Orphan", "nodeType": "PRIMARY",
                                    "positionX": 0.0, "positionY": 0.0}], "edges": []}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A roadmap must have exactly one main node"));

        mockMvc.perform(graphSave(token, roadmapId, """
                        {"nodes": [{"id": %d, "ref": "r", "title": "Bad graphs", "nodeType": "ROOT",
                                    "positionX": 0.0, "positionY": 0.0}],
                         "edges": [{"sourceRef": "r", "targetRef": "r"}]}
                        """.formatted(rootId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A node cannot be connected to itself"));

        mockMvc.perform(delete("/api/roadmaps/{id}/nodes/{nodeId}", roadmapId, rootId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The main node of a roadmap cannot be deleted"));
    }

    @Test
    void onlyTheAuthorCanChangeTheGraph() throws Exception {
        String author = signIn("author.four", "author.four@example.com");
        String stranger = signIn("stranger", "stranger@example.com");
        long roadmapId = createRoadmap(author, "Private path").get("id").asLong();
        long rootId = readGraph(roadmapId).get("nodes").get(0).get("id").asLong();

        String payload = """
                {"nodes": [{"id": %d, "ref": "r", "title": "Hijacked", "nodeType": "ROOT",
                            "positionX": 0.0, "positionY": 0.0}], "edges": []}
                """.formatted(rootId);

        mockMvc.perform(graphSave(stranger, roadmapId, payload))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/roadmaps/{id}/graph", roadmapId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());

        // Anyone may still read the graph.
        mockMvc.perform(get("/api/roadmaps/{id}/graph", roadmapId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes[0].title").value("Private path"));
    }

    @Test
    void deletingARoadmapRemovesItsGraph() throws Exception {
        String token = signIn("author.five", "author.five@example.com");
        long roadmapId = createRoadmap(token, "Throwaway").get("id").asLong();
        long rootId = readGraph(roadmapId).get("nodes").get(0).get("id").asLong();

        saveGraph(token, roadmapId, """
                {"nodes": [
                   {"id": %d, "ref": "r", "title": "Throwaway", "nodeType": "ROOT",
                    "positionX": 0.0, "positionY": 0.0},
                   {"ref": "tmp", "title": "Step", "nodeType": "PRIMARY",
                    "positionX": 0.0, "positionY": 150.0}],
                 "edges": [{"sourceRef": "r", "targetRef": "tmp"}]}
                """.formatted(rootId));

        mockMvc.perform(delete("/api/roadmaps/{id}", roadmapId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/roadmaps/{id}/graph", roadmapId))
                .andExpect(status().isNotFound());
    }

    // --- helpers -------------------------------------------------------------

    private String signIn(String username, String email) throws Exception {
        String credentials = """
                {"username":"%s","email":"%s","password":"correct horse battery"}
                """.formatted(username, email);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials))
                .andExpect(status().isCreated());

        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"correct horse battery"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Matcher matcher = ACCESS_TOKEN.matcher(body);
        assertThat(matcher.find()).as("login response carries an access token").isTrue();
        return matcher.group(1);
    }

    private JsonNode createRoadmap(String token, String title) throws Exception {
        String body = mockMvc.perform(post("/api/roadmaps")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","description":"generated by test"}
                                """.formatted(title)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(body);
    }

    private JsonNode readGraph(long roadmapId) throws Exception {
        String body = mockMvc.perform(get("/api/roadmaps/{id}/graph", roadmapId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    private JsonNode saveGraph(String token, long roadmapId, String payload) throws Exception {
        String body = mockMvc.perform(graphSave(token, roadmapId, payload))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    private org.springframework.test.web.servlet.RequestBuilder graphSave(
            String token, long roadmapId, String payload) {
        return put("/api/roadmaps/{id}/graph", roadmapId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload);
    }

    private JsonNode nodeById(JsonNode graph, long id) {
        for (JsonNode node : graph.get("nodes")) {
            if (node.get("id").asLong() == id) return node;
        }
        throw new AssertionError("No node with id " + id);
    }

    private JsonNode nodeByTitle(JsonNode graph, String title) {
        for (JsonNode node : graph.get("nodes")) {
            if (title.equals(node.get("title").asText())) return node;
        }
        throw new AssertionError("No node titled " + title);
    }

    private long nodeIdByTitle(JsonNode graph, String title) {
        return nodeByTitle(graph, title).get("id").asLong();
    }

    private long incomingEdgeCount(JsonNode graph, long nodeId) {
        long count = 0;
        for (JsonNode edge : graph.get("edges")) {
            if (edge.get("targetNodeId").asLong() == nodeId) count++;
        }
        return count;
    }
}

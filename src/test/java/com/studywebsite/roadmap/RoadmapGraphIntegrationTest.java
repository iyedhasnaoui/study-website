package com.studywebsite.roadmap;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
        String token = signIn("author.one");
        JsonNode roadmap = createRoadmap(token, "Analysis 1");

        assertThat(roadmap.get("nodes")).hasSize(1);
        assertThat(roadmap.get("nodes").get(0).get("nodeType").asText()).isEqualTo("ROOT");
        assertThat(roadmap.get("edges")).isEmpty();
    }

    @Test
    void graphSurvivesAFullEditAndReloadCycle() throws Exception {
        String token = signIn("author.two");
        long roadmapId = createRoadmap(token, "Exchange prep").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        Graph graph = new Graph()
                .root(rootId, "Exchange prep", true, 120, 40)
                .node("t1", "Pick partner university", "PRIMARY", false, 0, 220)
                .node("t2", "Motivation letter", "SECONDARY", false, 300, 220)
                .node("t3", "Submit application", "PRIMARY", false, 150, 400)
                .edge(rootRef(rootId), "t1").edge(rootRef(rootId), "t2")
                .edge("t1", "t3").edge("t2", "t3");

        JsonNode saved = saveGraph(token, roadmapId, graph.json());
        assertThat(saved.get("nodes")).hasSize(4);
        assertThat(saved.get("edges")).hasSize(4);

        // "Submit application" is fed by both branches: a merge, impossible under the old tree model.
        long mergeId = nodeByTitle(saved, "Submit application").get("id").asLong();
        assertThat(incomingEdgeCount(saved, mergeId)).isEqualTo(2);

        JsonNode reloaded = readGraph(roadmapId);
        JsonNode root = nodeById(reloaded, rootId);
        assertThat(root.get("positionX").asDouble()).isEqualTo(120.0);
        assertThat(root.get("gate").asBoolean()).isTrue();
        assertThat(nodeByTitle(reloaded, "Pick partner university").get("nodeType").asText()).isEqualTo("PRIMARY");
        assertThat(incomingEdgeCount(reloaded, mergeId)).isEqualTo(2);

        // Edit one node and delete another in a single save.
        long partnerId = nodeByTitle(reloaded, "Pick partner university").get("id").asLong();
        long letterId = nodeByTitle(reloaded, "Motivation letter").get("id").asLong();
        Graph trimmed = new Graph()
                .root(rootId, "Exchange prep", false, 120, 40)
                .existing(partnerId, "Shortlist universities", "PRIMARY", false, 10, 240)
                .existing(letterId, "Motivation letter", "SECONDARY", false, 300, 220)
                .edge(rootRef(rootId), refOf(partnerId))
                .edge(refOf(partnerId), refOf(letterId));

        JsonNode afterEdit = saveGraph(token, roadmapId, trimmed.json());
        assertThat(afterEdit.get("nodes")).hasSize(3);
        assertThat(nodeById(afterEdit, partnerId).get("title").asText()).isEqualTo("Shortlist universities");
        assertThat(readGraph(roadmapId).get("nodes")).hasSize(3);
    }

    @Test
    void loopsAreRejected() throws Exception {
        String token = signIn("author.loop");
        long roadmapId = createRoadmap(token, "Loopy").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        Graph cyclic = new Graph()
                .root(rootId, "Loopy", false, 0, 0)
                .node("a", "Step A", "PRIMARY", false, 0, 150)
                .node("b", "Step B", "PRIMARY", false, 0, 300)
                .edge(rootRef(rootId), "a").edge("a", "b").edge("b", "a");

        mockMvc.perform(graphSave(token, roadmapId, cyclic.json()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("must not contain a loop")));
    }

    @Test
    void unreachableNodesAreRejected() throws Exception {
        String token = signIn("author.island");
        long roadmapId = createRoadmap(token, "Islands").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        Graph orphaned = new Graph()
                .root(rootId, "Islands", false, 0, 0)
                .node("a", "Connected step", "PRIMARY", false, 0, 150)
                .node("b", "Floating step", "PRIMARY", false, 300, 150)
                .edge(rootRef(rootId), "a");

        mockMvc.perform(graphSave(token, roadmapId, orphaned.json()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("\"Floating step\"")));
    }

    @Test
    void branchingRequiresAGate() throws Exception {
        String token = signIn("author.gate");
        long roadmapId = createRoadmap(token, "Forks").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        Graph ungated = new Graph()
                .root(rootId, "Forks", false, 0, 0)
                .node("a", "Track A", "PRIMARY", false, -150, 150)
                .node("b", "Track B", "PRIMARY", false, 150, 150)
                .edge(rootRef(rootId), "a").edge(rootRef(rootId), "b");

        mockMvc.perform(graphSave(token, roadmapId, ungated.json()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("only lead to several next steps when it is marked as a gate")));

        // Marking the forking step as a gate makes the very same shape legal.
        Graph gated = new Graph()
                .root(rootId, "Forks", true, 0, 0)
                .node("a", "Track A", "PRIMARY", false, -150, 150)
                .node("b", "Track B", "PRIMARY", false, 150, 150)
                .edge(rootRef(rootId), "a").edge(rootRef(rootId), "b");

        assertThat(saveGraph(token, roadmapId, gated.json()).get("nodes")).hasSize(3);
    }

    @Test
    void graphSizeIsBounded() throws Exception {
        String token = signIn("author.size");
        long roadmapId = createRoadmap(token, "Sizes").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        Graph tooSmall = new Graph()
                .root(rootId, "Sizes", false, 0, 0)
                .node("a", "Only step", "PRIMARY", false, 0, 150)
                .edge(rootRef(rootId), "a");

        mockMvc.perform(graphSave(token, roadmapId, tooSmall.json()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("at least 3 nodes")));

        mockMvc.perform(graphSave(token, roadmapId, chain(rootId, "Sizes", 26).json()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("at most 25 nodes")));

        // At 20 the save succeeds but carries the nudge to split the roadmap up.
        JsonNode large = saveGraph(token, roadmapId, chain(rootId, "Sizes", 20).json());
        assertThat(large.get("nodes")).hasSize(20);
        assertThat(large.get("advisories")).hasSize(1);
        assertThat(large.get("advisories").get(0).asText()).contains("own roadmap");

        JsonNode small = saveGraph(token, roadmapId, chain(rootId, "Sizes", 5).json());
        assertThat(small.get("advisories")).isEmpty();
    }

    @Test
    void aBranchCanBecomeItsOwnRoadmap() throws Exception {
        String token = signIn("author.split");
        long roadmapId = createRoadmap(token, "Big plan").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        // root -> a -> c -> d   and   root -> b -> e
        Graph graph = new Graph()
                .root(rootId, "Big plan", true, 0, 0)
                .node("a", "Deep dive", "PRIMARY", false, -200, 150)
                .node("b", "Side track", "PRIMARY", false, 200, 150)
                .node("c", "Deep dive part 2", "PRIMARY", false, -200, 300)
                .node("d", "Deep dive part 3", "PRIMARY", false, -200, 450)
                .node("e", "Side track part 2", "PRIMARY", false, 200, 300)
                .edge(rootRef(rootId), "a").edge(rootRef(rootId), "b")
                .edge("a", "c").edge("c", "d").edge("b", "e");

        JsonNode saved = saveGraph(token, roadmapId, graph.json());
        long deepDiveId = nodeByTitle(saved, "Deep dive").get("id").asLong();

        String body = mockMvc.perform(post("/api/roadmaps/{id}/nodes/{nodeId}/extract", roadmapId, deepDiveId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode extracted = objectMapper.readTree(body);

        // The new roadmap owns the branch, with the split step as its main node.
        assertThat(extracted.get("title").asText()).isEqualTo("Deep dive");
        assertThat(titlesOf(extracted)).containsExactlyInAnyOrder(
                "Deep dive", "Deep dive part 2", "Deep dive part 3");
        assertThat(nodeByTitle(extracted, "Deep dive").get("nodeType").asText()).isEqualTo("ROOT");
        assertThat(nodeByTitle(extracted, "Deep dive").get("positionX").asDouble()).isEqualTo(0.0);

        // The original keeps the step as a link and loses only the moved branch.
        JsonNode original = readGraph(roadmapId);
        assertThat(titlesOf(original)).containsExactlyInAnyOrder(
                "Big plan", "Deep dive", "Side track", "Side track part 2");
        assertThat(nodeByTitle(original, "Deep dive").get("linkedRoadmapId").asLong())
                .isEqualTo(extracted.get("roadmapId").asLong());
    }

    @Test
    void stepsWithoutABranchOfTheirOwnCannotBeExtracted() throws Exception {
        String token = signIn("author.leaf");
        long roadmapId = createRoadmap(token, "Flat").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        JsonNode saved = saveGraph(token, roadmapId, chain(rootId, "Flat", 3).json());
        long leafId = nodeByTitle(saved, "Flat step 2").get("id").asLong();

        mockMvc.perform(post("/api/roadmaps/{id}/nodes/{nodeId}/extract", roadmapId, leafId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("no branch of its own")));

        mockMvc.perform(post("/api/roadmaps/{id}/nodes/{nodeId}/extract", roadmapId, rootId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("main node cannot be split")));
    }

    @Test
    void graphIsRejectedWithoutExactlyOneMainNode() throws Exception {
        String token = signIn("author.three");
        long roadmapId = createRoadmap(token, "Bad graphs").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

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
        String author = signIn("author.four");
        String stranger = signIn("stranger");
        long roadmapId = createRoadmap(author, "Private path").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        String payload = chain(rootId, "Private path", 3).json();

        mockMvc.perform(graphSave(stranger, roadmapId, payload)).andExpect(status().isForbidden());

        mockMvc.perform(put("/api/roadmaps/{id}/graph", roadmapId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/roadmaps/{id}/nodes/{nodeId}/extract", roadmapId, rootId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + stranger))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/roadmaps/{id}/graph", roadmapId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes[0].title").value("Private path"));
    }

    @Test
    void deletingARoadmapRemovesItsGraph() throws Exception {
        String token = signIn("author.five");
        long roadmapId = createRoadmap(token, "Throwaway").get("id").asLong();
        long rootId = rootIdOf(roadmapId);

        saveGraph(token, roadmapId, chain(rootId, "Throwaway", 4).json());

        mockMvc.perform(delete("/api/roadmaps/{id}", roadmapId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/roadmaps/{id}/graph", roadmapId))
                .andExpect(status().isNotFound());
    }

    // --- payload building ----------------------------------------------------

    /** Builds a save payload without hand-writing JSON for every node and edge. */
    private static final class Graph {
        private final List<String> nodes = new ArrayList<>();
        private final List<String> edges = new ArrayList<>();

        Graph root(long id, String title, boolean gate, double x, double y) {
            return existing(id, title, "ROOT", gate, x, y);
        }

        Graph existing(long id, String title, String type, boolean gate, double x, double y) {
            nodes.add("""
                    {"id": %d, "ref": "%s", "title": "%s", "nodeType": "%s", "gate": %s,
                     "positionX": %s, "positionY": %s}"""
                    .formatted(id, refOf(id), title, type, gate, x, y));
            return this;
        }

        Graph node(String ref, String title, String type, boolean gate, double x, double y) {
            nodes.add("""
                    {"ref": "%s", "title": "%s", "nodeType": "%s", "gate": %s,
                     "positionX": %s, "positionY": %s}"""
                    .formatted(ref, title, type, gate, x, y));
            return this;
        }

        Graph edge(String sourceRef, String targetRef) {
            edges.add("{\"sourceRef\": \"%s\", \"targetRef\": \"%s\"}".formatted(sourceRef, targetRef));
            return this;
        }

        String json() {
            return "{\"nodes\": [" + String.join(",", nodes)
                    + "], \"edges\": [" + String.join(",", edges) + "]}";
        }
    }

    /** A straight line of {@code size} nodes starting at the existing root. */
    private Graph chain(long rootId, String title, int size) {
        Graph graph = new Graph().root(rootId, title, false, 0, 0);
        String previous = refOf(rootId);
        for (int i = 1; i < size; i++) {
            String ref = "s" + i;
            graph.node(ref, title + " step " + i, "PRIMARY", false, 0, i * 120);
            graph.edge(previous, ref);
            previous = ref;
        }
        return graph;
    }

    private static String refOf(long id) {
        return "n" + id;
    }

    private static String rootRef(long rootId) {
        return refOf(rootId);
    }

    // --- helpers -------------------------------------------------------------

    private String signIn(String username) throws Exception {
        String email = username + "@example.com";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","email":"%s","password":"correct horse battery"}
                                """.formatted(username, email)))
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

    private long rootIdOf(long roadmapId) throws Exception {
        return readGraph(roadmapId).get("nodes").get(0).get("id").asLong();
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
        throw new AssertionError("No node titled " + title + " in " + titlesOf(graph));
    }

    private List<String> titlesOf(JsonNode graph) {
        List<String> titles = new ArrayList<>();
        graph.get("nodes").forEach(node -> titles.add(node.get("title").asText()));
        return titles.stream().collect(Collectors.toList());
    }

    private long incomingEdgeCount(JsonNode graph, long nodeId) {
        long count = 0;
        for (JsonNode edge : graph.get("edges")) {
            if (edge.get("targetNodeId").asLong() == nodeId) count++;
        }
        return count;
    }
}

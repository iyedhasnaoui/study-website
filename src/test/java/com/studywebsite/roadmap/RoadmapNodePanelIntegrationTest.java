package com.studywebsite.roadmap;

import com.studywebsite.model.FaqEntry;
import com.studywebsite.model.ForumPost;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Resource;
import com.studywebsite.model.ResourceType;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.User;
import com.studywebsite.model.ZitounaTag;
import com.studywebsite.repository.FaqEntryRepository;
import com.studywebsite.repository.ForumPostRepository;
import com.studywebsite.repository.ResourceRepository;
import com.studywebsite.repository.RoadmapRepository;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.ZitounaTagRepository;
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
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The node panel: links to the rest of Zitun and the web, and people who vouch for a step. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:roadmapnodepaneldb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.sql.init.mode=never",
        "spring.docker.compose.enabled=false"
})
@AutoConfigureMockMvc
class RoadmapNodePanelIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private RoadmapRepository roadmaps;
    @Autowired private UserRepository users;
    @Autowired private ZitounaTagRepository tags;
    @Autowired private ForumPostRepository forumPosts;
    @Autowired private ResourceRepository materials;
    @Autowired private FaqEntryRepository faqs;
    @MockitoBean private JwtDecoder jwtDecoder;

    @Test
    void linksAreResolvedOnEveryReadAndCheckedOnEverySave() throws Exception {
        User author = user("links.author");
        RequestPostProcessor owner = TestAuth.contributor(author.getId());
        JsonNode created = createRoadmap(owner, "Analysis 1 links");
        long roadmapId = created.get("id").asLong();
        long rootId = created.get("nodes").get(0).get("id").asLong();

        long sameTags = forumPost(author, "Which criteria are examined?", ModerationStatus.APPROVED, "tum", "university of singapore");
        long otherTags = forumPost(author, "Numerics at TUM", ModerationStatus.APPROVED, "tum");
        long waiting = forumPost(author, "Still in review", ModerationStatus.PENDING, "tum", "university of singapore");

        JsonNode saved = saveGraph(owner, roadmapId, threeSteps(rootId, "Analysis 1 links", links("""
                [{"kind":"INTERNAL","targetType":"FORUM","targetId":%d},
                 {"kind":"INTERNAL","targetType":"FORUM","targetId":%d},
                 {"kind":"EXTERNAL","url":"https://youtube.com/watch?v=lectures","label":"lecture series"},
                 {"kind":"EXTERNAL","url":" https://example.org/notes.pdf "},
                 {"kind":"INTERNAL","targetType":"FORUM","targetId":%d}]
                """.formatted(sameTags, otherTags, sameTags))));

        JsonNode links = nodeByTitle(saved, "Series & convergence").get("links");
        assertThat(links).as("the repeated thread is kept once").hasSize(4);
        assertThat(links.get(0).get("label").asText()).isEqualTo("Which criteria are examined?");
        assertThat(links.get(0).get("insideTag").asBoolean()).isTrue();
        assertThat(links.get(0).get("replyCount").asInt()).isZero();
        assertThat(links.get(1).get("insideTag").asBoolean()).as("carries only one of the two tags").isFalse();
        assertThat(links.get(2).get("label").asText()).isEqualTo("lecture series");
        assertThat(links.get(2).get("insideTag").asBoolean()).isFalse();
        assertThat(links.get(3).get("url").asText()).isEqualTo("https://example.org/notes.pdf");
        assertThat(links.get(3).get("label").asText()).as("falls back to the host").isEqualTo("example.org");
        assertThat(nodeByTitle(saved, "Sequences & limits").get("links")).isEmpty();

        // A client that does not send links (an older editor, say) must not wipe them.
        long a = nodeByTitle(saved, "Sequences & limits").get("id").asLong();
        long b = nodeByTitle(saved, "Series & convergence").get("id").asLong();
        long c = nodeByTitle(saved, "Exam prep").get("id").asLong();
        JsonNode untouched = saveGraph(owner, roadmapId, new Graph(rootId, "Analysis 1 links")
                .node(a, "n" + a, "Sequences & limits", "PRIMARY", "")
                .node(b, "n" + b, "Series & convergence", "PRIMARY", "")
                .node(c, "n" + c, "Exam prep", "PRIMARY", "")
                .chain("n" + a, "n" + b, "n" + c)
                .json());
        assertThat(nodeByTitle(untouched, "Series & convergence").get("links")).hasSize(4);

        rejectSave(owner, roadmapId, threeSteps(rootId, "Analysis 1 links", links("""
                [{"kind":"INTERNAL","targetType":"FORUM","targetId":%d}]""".formatted(waiting))),
                "no longer available");
        rejectSave(owner, roadmapId, threeSteps(rootId, "Analysis 1 links", links("""
                [{"kind":"INTERNAL","targetType":"FAQ","targetId":987654}]""")),
                "no longer available");
        rejectSave(owner, roadmapId, threeSteps(rootId, "Analysis 1 links", links("""
                [{"kind":"EXTERNAL","url":"javascript:alert(1)"}]""")),
                "not a web address");
        rejectSave(owner, roadmapId, threeSteps(rootId, "Analysis 1 links", links("""
                [{"kind":"INTERNAL","targetType":"ROADMAP","targetId":%d}]""".formatted(roadmapId))),
                "roadmap it is part of");

        // A renamed thread shows its new title; an unpublished one is hidden from readers only.
        ForumPost renamed = forumPosts.findById(sameTags).orElseThrow();
        renamed.setTitle("Which criteria are examined in 2026?");
        forumPosts.saveAndFlush(renamed);
        ForumPost unpublished = forumPosts.findById(otherTags).orElseThrow();
        unpublished.setModerationStatus(ModerationStatus.REJECTED);
        forumPosts.saveAndFlush(unpublished);
        approve(roadmapId);

        JsonNode readerLinks = nodeByTitle(read(get("/api/roadmaps/{id}/graph", roadmapId)), "Series & convergence")
                .get("links");
        assertThat(readerLinks).hasSize(3);
        assertThat(readerLinks.get(0).get("label").asText()).isEqualTo("Which criteria are examined in 2026?");

        JsonNode editorLinks = nodeByTitle(read(get("/api/roadmaps/{id}/graph", roadmapId).with(owner)),
                "Series & convergence").get("links");
        assertThat(editorLinks).hasSize(4);
        assertThat(editorLinks.get(1).get("available").asBoolean()).isFalse();
        assertThat(editorLinks.get(1).get("label").asText()).as("last known title").isEqualTo("Numerics at TUM");
    }

    @Test
    void suggestionsOfferPublishedContentCarryingTheRoadmapsTags() throws Exception {
        User author = user("suggest.author");
        RequestPostProcessor owner = TestAuth.contributor(author.getId());
        long roadmapId = createRoadmap(owner, "Suggestions roadmap").get("id").asLong();

        long thread = forumPost(author, "Suggest: same tags", ModerationStatus.APPROVED, "tum", "university of singapore");
        long narrower = forumPost(author, "Suggest: TUM only", ModerationStatus.APPROVED, "tum");
        long waiting = forumPost(author, "Suggest: pending", ModerationStatus.PENDING, "tum", "university of singapore");
        long material = material(author, "Suggest: Formelsammlung", ModerationStatus.APPROVED, "tum", "university of singapore");
        long faq = faq("Suggest: which criteria are examined?", true, "tum", "university of singapore");
        long draftFaq = faq("Suggest: draft answer", false, "tum", "university of singapore");
        long neighbour = taggedRoadmap(author, "Suggest: neighbour", ModerationStatus.APPROVED, "tum", "university of singapore");

        List<String> offered = new ArrayList<>();
        read(get("/api/roadmaps/{id}/link-suggestions", roadmapId).with(owner))
                .forEach(item -> offered.add(item.get("targetType").asText() + ":" + item.get("targetId").asLong()));

        assertThat(offered).contains("FORUM:" + thread, "LEARNING_MATERIAL:" + material, "FAQ:" + faq,
                "ROADMAP:" + neighbour);
        assertThat(offered).doesNotContain("FORUM:" + narrower, "FORUM:" + waiting, "FAQ:" + draftFaq,
                "ROADMAP:" + roadmapId);

        // Suggestions are for the people drawing the roadmap.
        mockMvc.perform(get("/api/roadmaps/{id}/link-suggestions", roadmapId)
                        .with(TestAuth.contributor(user("suggest.stranger").getId())))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/roadmaps/{id}/link-suggestions", roadmapId))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void vouchesStayHiddenUntilAnAdminAcceptsThem() throws Exception {
        User author = user("vouch.author");
        RequestPostProcessor owner = TestAuth.contributor(author.getId());
        RequestPostProcessor admin = TestAuth.admin(user("vouch.admin").getId());
        JsonNode created = createRoadmap(owner, "Vouched roadmap");
        long roadmapId = created.get("id").asLong();
        long rootId = created.get("nodes").get(0).get("id").asLong();

        JsonNode saved = saveGraph(owner, roadmapId, new Graph(rootId, "Vouched roadmap")
                .node(null, "a", "Sequences & limits", "PRIMARY", "")
                .node(null, "b", "Series & convergence", "PRIMARY", vouches("""
                        [{"personName":" Amine ","note":"wrote the forum thread (2025)"}]"""))
                .node(null, "c", "Formula sheet allowed", "NOTE", vouches("""
                        [{"personName":"Nobody"}]"""))
                .chain("a", "b", "c")
                .json());

        assertThat(nodeByTitle(saved, "Formula sheet allowed").get("vouches"))
                .as("a note is not a step anybody did").isEmpty();
        JsonNode vouch = nodeByTitle(saved, "Series & convergence").get("vouches").get(0);
        assertThat(vouch.get("personName").asText()).isEqualTo("Amine");
        assertThat(vouch.get("status").asText()).isEqualTo("PENDING");
        long vouchId = vouch.get("id").asLong();

        approve(roadmapId);
        assertThat(nodeByTitle(read(get("/api/roadmaps/{id}/graph", roadmapId)), "Series & convergence")
                .get("vouches")).isEmpty();

        JsonNode queued = queuedVouch(admin, vouchId);
        assertThat(queued).isNotNull();
        assertThat(queued.get("title").asText()).isEqualTo("Amine vouches for \"Series & convergence\"");
        assertThat(queued.get("authorUsername").asText()).isEqualTo("vouch.author");
        assertThat(queued.get("details").get("roadmapId").asLong()).isEqualTo(roadmapId);
        assertThat(queued.get("details").get("note").asText()).isEqualTo("wrote the forum thread (2025)");

        mockMvc.perform(moderate(admin, vouchId, "needs-fixing"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A vouch can only be accepted or rejected"));
        mockMvc.perform(moderate(admin, vouchId, "approve")).andExpect(status().isNoContent());

        JsonNode shown = nodeByTitle(read(get("/api/roadmaps/{id}/graph", roadmapId)), "Series & convergence")
                .get("vouches");
        assertThat(shown).hasSize(1);
        assertThat(shown.get(0).get("status").asText()).isEqualTo("APPROVED");
        assertThat(queuedVouch(admin, vouchId)).isNull();

        long a = nodeByTitle(saved, "Sequences & limits").get("id").asLong();
        long b = nodeByTitle(saved, "Series & convergence").get("id").asLong();
        long c = nodeByTitle(saved, "Formula sheet allowed").get("id").asLong();
        String amine = "{\"id\":%d,\"personName\":\"Amine\",\"note\":\"%s\"}";

        // Saving it back unchanged keeps the decision. A copied id never carries it to another step.
        JsonNode resaved = saveGraph(owner, roadmapId, new Graph(rootId, "Vouched roadmap")
                .node(a, "n" + a, "Sequences & limits", "PRIMARY",
                        vouches("[" + amine.formatted(vouchId, "wrote the forum thread (2025)") + "]"))
                .node(b, "n" + b, "Series & convergence", "PRIMARY",
                        vouches("[" + amine.formatted(vouchId, "wrote the forum thread (2025)") + "]"))
                .node(c, "n" + c, "Formula sheet allowed", "NOTE", "")
                .chain("n" + a, "n" + b, "n" + c)
                .json());
        JsonNode kept = nodeByTitle(resaved, "Series & convergence").get("vouches").get(0);
        assertThat(kept.get("id").asLong()).isEqualTo(vouchId);
        assertThat(kept.get("status").asText()).isEqualTo("APPROVED");
        JsonNode copied = nodeByTitle(resaved, "Sequences & limits").get("vouches").get(0);
        assertThat(copied.get("id").asLong()).isNotEqualTo(vouchId);
        assertThat(copied.get("status").asText()).isEqualTo("PENDING");

        // Editing what the person did sends it back to an admin; an empty list removes them all.
        JsonNode edited = saveGraph(owner, roadmapId, new Graph(rootId, "Vouched roadmap")
                .node(a, "n" + a, "Sequences & limits", "PRIMARY", vouches("[]"))
                .node(b, "n" + b, "Series & convergence", "PRIMARY",
                        vouches("[" + amine.formatted(vouchId, "wrote two forum threads") + "]"))
                .node(c, "n" + c, "Formula sheet allowed", "NOTE", "")
                .chain("n" + a, "n" + b, "n" + c)
                .json());
        JsonNode reopened = nodeByTitle(edited, "Series & convergence").get("vouches").get(0);
        assertThat(reopened.get("id").asLong()).isEqualTo(vouchId);
        assertThat(reopened.get("status").asText()).isEqualTo("PENDING");
        assertThat(nodeByTitle(edited, "Sequences & limits").get("vouches")).isEmpty();
        assertThat(queuedVouch(admin, vouchId)).isNotNull();
    }

    @Test
    void linksAndVouchesMoveWithABranchThatBecomesItsOwnRoadmap() throws Exception {
        User author = user("split.author");
        RequestPostProcessor owner = TestAuth.contributor(author.getId());
        RequestPostProcessor admin = TestAuth.admin(user("split.admin").getId());
        JsonNode created = createRoadmap(owner, "Big plan");
        long roadmapId = created.get("id").asLong();
        long rootId = created.get("nodes").get(0).get("id").asLong();
        String root = "n" + rootId;

        JsonNode saved = saveGraph(owner, roadmapId, new Graph(rootId, "Big plan", true)
                .node(null, "a", "Deep dive", "PRIMARY", links("""
                        [{"kind":"EXTERNAL","url":"https://example.org/deep-dive"}]""") + ", " + vouches("""
                        [{"personName":"Lina"}]"""))
                .node(null, "b", "Side track", "PRIMARY", "")
                .node(null, "c", "Deep dive part 2", "PRIMARY", links("""
                        [{"kind":"EXTERNAL","url":"https://example.org/part-2","label":"Part 2 notes"}]""")
                        + ", " + vouches("""
                        [{"personName":"Amine","note":"did it in 2025"}]"""))
                .node(null, "d", "Deep dive part 3", "PRIMARY", "")
                .node(null, "e", "Side track part 2", "PRIMARY", "")
                .edge(root, "a").edge(root, "b").edge("a", "c").edge("c", "d").edge("b", "e")
                .json());

        long partTwoVouch = nodeByTitle(saved, "Deep dive part 2").get("vouches").get(0).get("id").asLong();
        mockMvc.perform(moderate(admin, partTwoVouch, "approve")).andExpect(status().isNoContent());

        long deepDive = nodeByTitle(saved, "Deep dive").get("id").asLong();
        JsonNode extracted = objectMapper.readTree(mockMvc.perform(
                        post("/api/roadmaps/{id}/nodes/{nodeId}/extract", roadmapId, deepDive).with(owner))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());

        JsonNode movedStep = nodeByTitle(extracted, "Deep dive part 2");
        assertThat(movedStep.get("links").get(0).get("label").asText()).isEqualTo("Part 2 notes");
        assertThat(movedStep.get("vouches").get(0).get("personName").asText()).isEqualTo("Amine");
        assertThat(movedStep.get("vouches").get(0).get("status").asText()).as("the decision moves along")
                .isEqualTo("APPROVED");

        JsonNode newRoot = nodeByTitle(extracted, "Deep dive");
        assertThat(newRoot.get("links").get(0).get("url").asText()).isEqualTo("https://example.org/deep-dive");
        assertThat(newRoot.get("vouches")).as("a main topic is not a step").isEmpty();

        JsonNode staying = nodeByTitle(read(get("/api/roadmaps/{id}/graph", roadmapId).with(owner)), "Deep dive");
        assertThat(staying.get("links")).hasSize(1);
        assertThat(staying.get("vouches").get(0).get("personName").asText()).isEqualTo("Lina");
    }

    // --- payload building ----------------------------------------------------

    /** Builds a save payload; {@code extras} are extra node fields such as links and vouches. */
    private static final class Graph {
        private final List<String> nodes = new ArrayList<>();
        private final List<String> edges = new ArrayList<>();
        private final String rootRef;

        Graph(long rootId, String title) {
            this(rootId, title, false);
        }

        Graph(long rootId, String title, boolean gate) {
            rootRef = "n" + rootId;
            nodes.add("""
                    {"id": %d, "ref": "%s", "title": "%s", "nodeType": "ROOT", "gate": %s,
                     "positionX": 0, "positionY": 0}""".formatted(rootId, rootRef, title, gate));
        }

        Graph node(Long id, String ref, String title, String type, String extras) {
            nodes.add("""
                    {"id": %s, "ref": "%s", "title": "%s", "nodeType": "%s",
                     "positionX": 0, "positionY": %d%s}"""
                    .formatted(id, ref, title, type, nodes.size() * 120, extras.isEmpty() ? "" : ", " + extras));
            return this;
        }

        Graph edge(String sourceRef, String targetRef) {
            edges.add("{\"sourceRef\": \"%s\", \"targetRef\": \"%s\"}".formatted(sourceRef, targetRef));
            return this;
        }

        /** Connects the main topic to the first ref, then each ref to the next. */
        Graph chain(String... refs) {
            String previous = rootRef;
            for (String ref : refs) {
                edge(previous, ref);
                previous = ref;
            }
            return this;
        }

        String json() {
            return "{\"nodes\": [" + String.join(",", nodes) + "], \"edges\": [" + String.join(",", edges) + "]}";
        }
    }

    private static String threeSteps(long rootId, String title, String seriesExtras) {
        return new Graph(rootId, title)
                .node(null, "a", "Sequences & limits", "PRIMARY", "")
                .node(null, "b", "Series & convergence", "PRIMARY", seriesExtras)
                .node(null, "c", "Exam prep", "PRIMARY", "")
                .chain("a", "b", "c")
                .json();
    }

    private static String links(String json) {
        return "\"links\": " + json;
    }

    private static String vouches(String json) {
        return "\"vouches\": " + json;
    }

    // --- fixtures ------------------------------------------------------------

    private User user(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPasswordHash("external");
        user.setKeycloakId("kc-" + username);
        user.setBanned(false);
        return users.saveAndFlush(user);
    }

    private Set<ZitounaTag> tagged(String... normalizedNames) {
        Set<ZitounaTag> found = new HashSet<>();
        Arrays.stream(normalizedNames)
                .map(name -> tags.findByNormalizedNameAndParentIsNull(name).orElseThrow())
                .forEach(found::add);
        return found;
    }

    private long tagId(String normalizedName) {
        return tags.findByNormalizedNameAndParentIsNull(normalizedName).orElseThrow().getId();
    }

    private long forumPost(User author, String title, ModerationStatus status, String... tagNames) {
        ForumPost post = ForumPost.builder()
                .author(author)
                .title(title)
                .content("Experience report: " + title)
                .moderationStatus(status)
                .tags(tagged(tagNames))
                .build();
        return forumPosts.saveAndFlush(post).getId();
    }

    private long material(User author, String title, ModerationStatus status, String... tagNames) {
        Resource material = Resource.builder()
                .author(author)
                .title(title)
                .type(ResourceType.PDF)
                .moderationStatus(status)
                .tags(tagged(tagNames))
                .build();
        return materials.saveAndFlush(material).getId();
    }

    private long faq(String question, boolean published, String... tagNames) {
        FaqEntry entry = FaqEntry.builder()
                .question(question)
                .answer("Answered by the admins.")
                .published(published)
                .tags(tagged(tagNames))
                .build();
        return faqs.saveAndFlush(entry).getId();
    }

    private long taggedRoadmap(User author, String title, ModerationStatus status, String... tagNames) {
        Roadmap roadmap = Roadmap.builder()
                .author(author)
                .title(title)
                .moderationStatus(status)
                .tags(tagged(tagNames))
                .build();
        return roadmaps.saveAndFlush(roadmap).getId();
    }

    /** Creates a roadmap the way the editor does, tagged TUM + University of Singapore. */
    private JsonNode createRoadmap(RequestPostProcessor owner, String title) throws Exception {
        return objectMapper.readTree(mockMvc.perform(post("/api/roadmaps").with(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"%s","tagSelection":{"institutionIds":[%d,%d]}}
                                """.formatted(title, tagId("tum"), tagId("university of singapore"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    /** Stands in for a moderator publishing the roadmap. */
    private void approve(long roadmapId) {
        Roadmap roadmap = roadmaps.findByIdWithTags(roadmapId).orElseThrow();
        roadmap.setModerationStatus(ModerationStatus.APPROVED);
        roadmaps.saveAndFlush(roadmap);
    }

    private JsonNode queuedVouch(RequestPostProcessor admin, long vouchId) throws Exception {
        for (JsonNode item : read(get("/api/admin/moderation").with(admin))) {
            if (item.get("area").asText().equals("ROADMAP_VOUCH") && item.get("id").asLong() == vouchId) {
                return item;
            }
        }
        return null;
    }

    private MockHttpServletRequestBuilder moderate(RequestPostProcessor admin, long vouchId, String decision) {
        return post("/api/admin/moderation/ROADMAP_VOUCH/{id}/{decision}", vouchId, decision)
                .with(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"\"}");
    }

    private JsonNode saveGraph(RequestPostProcessor owner, long roadmapId, String payload) throws Exception {
        return read(graphSave(owner, roadmapId, payload));
    }

    private void rejectSave(RequestPostProcessor owner, long roadmapId, String payload, String reason) throws Exception {
        mockMvc.perform(graphSave(owner, roadmapId, payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString(reason)));
    }

    private MockHttpServletRequestBuilder graphSave(RequestPostProcessor owner, long roadmapId, String payload) {
        return put("/api/roadmaps/{id}/graph", roadmapId)
                .with(owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload);
    }

    private JsonNode read(MockHttpServletRequestBuilder request) throws Exception {
        return objectMapper.readTree(mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    private JsonNode nodeByTitle(JsonNode graph, String title) {
        for (JsonNode node : graph.get("nodes")) {
            if (title.equals(node.get("title").asText())) return node;
        }
        throw new AssertionError("No node titled " + title);
    }
}

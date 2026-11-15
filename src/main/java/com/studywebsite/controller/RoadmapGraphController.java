package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapGraphResponseDto;
import com.studywebsite.dto.RoadmapGraphSaveDto;
import com.studywebsite.dto.RoadmapLinkSuggestionDto;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapEdge;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.User;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.security.CurrentUser;
import com.studywebsite.service.RoadmapService;
import com.studywebsite.service.roadmap.RoadmapGraphService;
import com.studywebsite.service.roadmap.RoadmapGraphValidator;
import com.studywebsite.service.roadmap.RoadmapNodeLinkService;
import com.studywebsite.service.roadmap.RoadmapVouchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/roadmaps/{roadmapId}")
@RequiredArgsConstructor
public class RoadmapGraphController {

    private final RoadmapService roadmapService;
    private final RoadmapGraphService roadmapGraphService;
    private final RoadmapGraphValidator validator;
    private final RoadmapNodeLinkService linkService;
    private final RoadmapVouchService vouchService;
    private final RoadmapMapper mapper;

    @GetMapping("/graph")
    public ResponseEntity<RoadmapGraphResponseDto> getGraph(@PathVariable Long roadmapId) {
        Roadmap roadmap = roadmapService.getByIdWithTags(roadmapId);
        AuthenticatedUserPrincipal principal = CurrentUser.find().orElse(null);

        if (!RoadmapController.isVisibleTo(roadmap, principal)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(readGraph(roadmap));
    }

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @PutMapping("/graph")
    public ResponseEntity<RoadmapGraphResponseDto> saveGraph(
            @PathVariable Long roadmapId,
            @Valid @RequestBody RoadmapGraphSaveDto payload) {

        Roadmap roadmap = requireEditableRoadmap(roadmapId);
        roadmap.setModerationStatus(ModerationStatus.PENDING);
        roadmap.setModerationNote(null);
        roadmapGraphService.saveGraph(roadmap, payload, CurrentUser.require().userId());
        return ResponseEntity.ok(readGraph(roadmap));
    }

    /**
     * Published content with the same tags as the roadmap — forum threads, learning materials,
     * FAQ entries and other roadmaps — for the editor to pick a node's links from.
     */
    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @GetMapping("/link-suggestions")
    public ResponseEntity<List<RoadmapLinkSuggestionDto>> linkSuggestions(@PathVariable Long roadmapId) {
        requireEditableRoadmap(roadmapId);
        return ResponseEntity.ok(linkService.suggestions(roadmapId));
    }

    /** Splits a step and the branch below it into a roadmap of its own. */
    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @PostMapping("/nodes/{nodeId}/extract")
    public ResponseEntity<RoadmapGraphResponseDto> extractNode(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId) {

        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap roadmap = roadmapService.getById(roadmapId);
        roadmapService.assertCanEdit(roadmap, principal);

        User author = new User();
        author.setId(principal.userId());

        Roadmap extracted = roadmapGraphService.extractNode(roadmap, nodeId, author);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + extracted.getId() + "/graph"))
                .body(readGraph(roadmapService.getByIdWithTags(extracted.getId())));
    }

    private Roadmap requireEditableRoadmap(Long roadmapId) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap roadmap = roadmapService.getByIdWithTags(roadmapId);
        roadmapService.assertCanEdit(roadmap, principal);
        return roadmap;
    }

    private RoadmapGraphResponseDto readGraph(Roadmap roadmap) {
        List<RoadmapNode> nodes = roadmapGraphService.findNodes(roadmap.getId());
        List<RoadmapEdge> edges = roadmapGraphService.findEdges(roadmap.getId());

        // Editors need to see what readers do not: dead links to remove and vouches still waiting.
        boolean editor = canEdit(roadmap, CurrentUser.find().orElse(null));
        return mapper.toGraphDto(roadmap, nodes, edges, validator.advisories(nodes.size()),
                linkService.linksByNode(roadmap.getId(), editor),
                vouchService.vouchesByNode(roadmap.getId(), editor));
    }

    private static boolean canEdit(Roadmap roadmap, AuthenticatedUserPrincipal principal) {
        if (principal == null) return false;
        if (principal.isAdmin()) return true;
        return roadmap.getAuthor() != null && principal.userId().equals(roadmap.getAuthor().getId());
    }
}

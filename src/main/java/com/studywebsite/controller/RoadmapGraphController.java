package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapGraphResponseDto;
import com.studywebsite.dto.RoadmapGraphSaveDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapEdge;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.User;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.security.CurrentUser;
import com.studywebsite.service.RoadmapService;
import com.studywebsite.service.roadmap.RoadmapGraphService;
import com.studywebsite.service.roadmap.RoadmapGraphValidator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    private final RoadmapMapper mapper;

    @GetMapping("/graph")
    public ResponseEntity<RoadmapGraphResponseDto> getGraph(@PathVariable Long roadmapId) {
        Roadmap roadmap = roadmapService.getById(roadmapId);
        Long viewerId = CurrentUser.find().map(AuthenticatedUserPrincipal::userId).orElse(null);

        if (!RoadmapController.isVisibleTo(roadmap, viewerId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(readGraph(roadmap));
    }

    @PutMapping("/graph")
    public ResponseEntity<RoadmapGraphResponseDto> saveGraph(
            @PathVariable Long roadmapId,
            @Valid @RequestBody RoadmapGraphSaveDto payload) {

        Roadmap roadmap = requireEditableRoadmap(roadmapId);
        roadmapGraphService.saveGraph(roadmap, payload);
        return ResponseEntity.ok(readGraph(roadmap));
    }

    /** Splits a step and the branch below it into a roadmap of its own. */
    @PostMapping("/nodes/{nodeId}/extract")
    public ResponseEntity<RoadmapGraphResponseDto> extractNode(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId) {

        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap roadmap = roadmapService.getById(roadmapId);
        roadmapService.assertCanEdit(roadmap, principal.userId());

        User author = new User();
        author.setId(principal.userId());

        Roadmap extracted = roadmapGraphService.extractNode(roadmap, nodeId, author);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + extracted.getId() + "/graph"))
                .body(readGraph(extracted));
    }

    private Roadmap requireEditableRoadmap(Long roadmapId) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap roadmap = roadmapService.getById(roadmapId);
        roadmapService.assertCanEdit(roadmap, principal.userId());
        return roadmap;
    }

    private RoadmapGraphResponseDto readGraph(Roadmap roadmap) {
        List<RoadmapNode> nodes = roadmapGraphService.findNodes(roadmap.getId());
        List<RoadmapEdge> edges = roadmapGraphService.findEdges(roadmap.getId());
        return mapper.toGraphDto(roadmap, nodes, edges, validator.advisories(nodes.size()));
    }
}

package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapGraphResponseDto;
import com.studywebsite.dto.RoadmapGraphSaveDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.security.CurrentUser;
import com.studywebsite.service.RoadmapService;
import com.studywebsite.service.roadmap.RoadmapGraphService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/roadmaps/{roadmapId}/graph")
@RequiredArgsConstructor
public class RoadmapGraphController {

    private final RoadmapService roadmapService;
    private final RoadmapGraphService roadmapGraphService;
    private final RoadmapMapper mapper;

    @GetMapping
    public ResponseEntity<RoadmapGraphResponseDto> getGraph(@PathVariable Long roadmapId) {
        return ResponseEntity.ok(readGraph(roadmapService.getById(roadmapId)));
    }

    @PutMapping
    public ResponseEntity<RoadmapGraphResponseDto> saveGraph(
            @PathVariable Long roadmapId,
            @Valid @RequestBody RoadmapGraphSaveDto payload) {

        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap roadmap = roadmapService.getById(roadmapId);
        roadmapService.assertCanEdit(roadmap, principal.userId());

        roadmapGraphService.saveGraph(roadmap, payload);
        return ResponseEntity.ok(readGraph(roadmap));
    }

    private RoadmapGraphResponseDto readGraph(Roadmap roadmap) {
        return mapper.toGraphDto(
                roadmap,
                roadmapGraphService.findNodes(roadmap.getId()),
                roadmapGraphService.findEdges(roadmap.getId()));
    }
}

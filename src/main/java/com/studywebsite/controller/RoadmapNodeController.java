package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapNodeCreateDto;
import com.studywebsite.dto.RoadmapNodeResponseDto;
import com.studywebsite.dto.RoadmapNodeUpdateDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.RoadmapNodeType;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.security.CurrentUser;
import com.studywebsite.service.RoadmapService;
import com.studywebsite.service.roadmap.RoadmapGraphService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/roadmaps/{roadmapId}/nodes")
@RequiredArgsConstructor
public class RoadmapNodeController {

    private final RoadmapService roadmapService;
    private final RoadmapGraphService roadmapGraphService;
    private final RoadmapMapper mapper;

    @GetMapping
    public ResponseEntity<List<RoadmapNodeResponseDto>> getAll(@PathVariable Long roadmapId) {
        roadmapService.getById(roadmapId);
        return ResponseEntity.ok(
                roadmapGraphService.findNodes(roadmapId).stream().map(mapper::toNodeDto).toList());
    }

    @GetMapping("/{nodeId}")
    public ResponseEntity<RoadmapNodeResponseDto> getById(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId) {

        return ResponseEntity.ok(mapper.toNodeDto(roadmapGraphService.getNode(roadmapId, nodeId)));
    }

    @PostMapping
    public ResponseEntity<RoadmapNodeResponseDto> create(
            @PathVariable Long roadmapId,
            @Valid @RequestBody RoadmapNodeCreateDto dto) {

        Roadmap roadmap = requireEditableRoadmap(roadmapId);

        RoadmapNode node = new RoadmapNode();
        node.setTitle(dto.getTitle());
        node.setDescription(dto.getDescription());
        node.setContent(dto.getContent());
        node.setNodeType(dto.getNodeType() == null ? RoadmapNodeType.PRIMARY : dto.getNodeType());
        node.setPositionX(dto.getPositionX() == null ? 0.0 : dto.getPositionX());
        node.setPositionY(dto.getPositionY() == null ? 0.0 : dto.getPositionY());

        RoadmapNode saved = roadmapGraphService.createNode(roadmap, node);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + roadmapId + "/nodes/" + saved.getId()))
                .body(mapper.toNodeDto(saved));
    }

    @PutMapping("/{nodeId}")
    public ResponseEntity<RoadmapNodeResponseDto> update(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId,
            @Valid @RequestBody RoadmapNodeUpdateDto dto) {

        requireEditableRoadmap(roadmapId);
        RoadmapNode existing = roadmapGraphService.getNode(roadmapId, nodeId);

        if (dto.getTitle() != null) {
            existing.setTitle(dto.getTitle());
        }
        if (dto.getDescription() != null) {
            existing.setDescription(dto.getDescription());
        }
        if (dto.getContent() != null) {
            existing.setContent(dto.getContent());
        }
        if (dto.getNodeType() != null && existing.getNodeType() != RoadmapNodeType.ROOT) {
            existing.setNodeType(dto.getNodeType());
        }
        if (dto.getPositionX() != null) {
            existing.setPositionX(dto.getPositionX());
        }
        if (dto.getPositionY() != null) {
            existing.setPositionY(dto.getPositionY());
        }

        return ResponseEntity.ok(mapper.toNodeDto(roadmapGraphService.updateNode(existing)));
    }

    @DeleteMapping("/{nodeId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId) {

        requireEditableRoadmap(roadmapId);
        roadmapGraphService.deleteNode(roadmapId, nodeId);
        return ResponseEntity.noContent().build();
    }

    private Roadmap requireEditableRoadmap(Long roadmapId) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap roadmap = roadmapService.getById(roadmapId);
        roadmapService.assertCanEdit(roadmap, principal.userId());
        return roadmap;
    }
}

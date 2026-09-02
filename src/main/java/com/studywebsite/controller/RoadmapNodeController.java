package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapNodeCreateDto;
import com.studywebsite.dto.RoadmapNodeResponseDto;
import com.studywebsite.dto.RoadmapNodeUpdateDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.service.RoadmapNodeService;
import com.studywebsite.service.RoadmapService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
//import java.util.Map;
//import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roadmaps/{roadmapId}/nodes")
@RequiredArgsConstructor
public class RoadmapNodeController {

    private final RoadmapService roadmapService;
    private final RoadmapNodeService roadmapNodeService;

    @GetMapping
    public ResponseEntity<List<RoadmapNodeResponseDto>> getAll(@PathVariable Long roadmapId) {
        roadmapService.getById(roadmapId); // validate roadmap exists
        List<RoadmapNode> nodes = roadmapNodeService.findByRoadmapId(roadmapId);
        return ResponseEntity.ok(nodes.stream().map(this::toDto).toList());
    }

    @GetMapping("/{nodeId}")
    public ResponseEntity<RoadmapNodeResponseDto> getById(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId) {

        roadmapService.getById(roadmapId);
        RoadmapNode node = roadmapNodeService.getById(nodeId);

        if (node.getRoadmap() == null || !roadmapId.equals(node.getRoadmap().getId())) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(toDto(node));
    }

    @PostMapping
    public ResponseEntity<RoadmapNodeResponseDto> create(
            @PathVariable Long roadmapId,
            @Valid @RequestBody RoadmapNodeCreateDto dto) {

        Roadmap roadmap = roadmapService.getById(roadmapId);

        RoadmapNode node = new RoadmapNode();
        node.setRoadmap(roadmap);
        node.setTitle(dto.getTitle());
        node.setContent(dto.getContent());
        node.setOrderIndex(dto.getOrderIndex());

        if (dto.getParentStepId() != null) {
            RoadmapNode parent = roadmapNodeService.getById(dto.getParentStepId());
            if (parent.getRoadmap() == null || !roadmapId.equals(parent.getRoadmap().getId())) {
                throw new RuntimeException("Parent node does not belong to this roadmap");
            }
            node.setParentStep(parent);
        }

        RoadmapNode saved = roadmapNodeService.create(node);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + roadmapId + "/nodes/" + saved.getId()))
                .body(toDto(saved));
    }

    @PutMapping("/{nodeId}")
    public ResponseEntity<RoadmapNodeResponseDto> update(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId,
            @Valid @RequestBody RoadmapNodeUpdateDto dto) {

        RoadmapNode existing = roadmapNodeService.getById(nodeId);
        if (existing.getRoadmap() == null || !roadmapId.equals(existing.getRoadmap().getId())) {
            return ResponseEntity.notFound().build();
        }

        if (dto.getTitle() != null) {
            existing.setTitle(dto.getTitle());
        }
        if (dto.getContent() != null) {
            existing.setContent(dto.getContent());
        }
        if (dto.getOrderIndex() != null) {
            existing.setOrderIndex(dto.getOrderIndex());
        }
        if (dto.getParentStepId() != null) {
            RoadmapNode parent = roadmapNodeService.getById(dto.getParentStepId());
            if (parent.getRoadmap() == null || !roadmapId.equals(parent.getRoadmap().getId())) {
                throw new RuntimeException("Parent node does not belong to this roadmap");
            }
            existing.setParentStep(parent);
        } else {
            existing.setParentStep(null);
        }

        RoadmapNode saved = roadmapNodeService.create(existing);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{nodeId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long roadmapId,
            @PathVariable Long nodeId) {

        RoadmapNode existing = roadmapNodeService.getById(nodeId);
        if (existing.getRoadmap() == null || !roadmapId.equals(existing.getRoadmap().getId())) {
            return ResponseEntity.notFound().build();
        }

        roadmapNodeService.delete(nodeId);
        return ResponseEntity.noContent().build();
    }

    private RoadmapNodeResponseDto toDto(RoadmapNode node) {
        return RoadmapNodeResponseDto.builder()
                .id(node.getId())
                .roadmapId(node.getRoadmap() != null ? node.getRoadmap().getId() : null)
                .parentStepId(node.getParentStep() != null ? node.getParentStep().getId() : null)
                .title(node.getTitle())
                .content(node.getContent())
                .orderIndex(node.getOrderIndex())
                .childSteps(List.of())
                .build();
    }
}
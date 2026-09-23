package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapCreateDto;
import com.studywebsite.dto.RoadmapNodeResponseDto;
import com.studywebsite.dto.RoadmapResponseDto;
import com.studywebsite.dto.RoadmapUpdateDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.User;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.service.RoadmapNodeService;
import com.studywebsite.service.RoadmapService;
import com.studywebsite.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roadmaps")
@RequiredArgsConstructor
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final RoadmapNodeService roadmapNodeService;

    @Autowired(required = false)
    private TagService tagService;

    @GetMapping
    public ResponseEntity<List<RoadmapResponseDto>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long authorId) {

        List<Roadmap> roadmaps = roadmapService.getAll().stream()
                .filter(roadmap -> roadmap.getModerationStatus() == null
                        || roadmap.getModerationStatus() == com.studywebsite.model.ModerationStatus.APPROVED)
                .toList();

        if (authorId != null) {
            roadmaps = roadmaps.stream()
                    .filter(r -> r.getAuthor() != null && authorId.equals(r.getAuthor().getId()))
                    .collect(Collectors.toList());
        }

        if (q != null && !q.isBlank()) {
            String query = q.trim().toLowerCase();
            roadmaps = roadmaps.stream()
                    .filter(r ->
                            (r.getTitle() != null && r.getTitle().toLowerCase().contains(query)) ||
                            (r.getDescription() != null && r.getDescription().toLowerCase().contains(query)))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(roadmaps.stream().map(this::toResponseDtoWithTree).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> getById(@PathVariable Long id) {
        Roadmap roadmap = roadmapService.getById(id);
        if (roadmap.getModerationStatus() != null
                && roadmap.getModerationStatus() != com.studywebsite.model.ModerationStatus.APPROVED) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toResponseDtoWithTree(roadmap));
    }

    @PostMapping
    public ResponseEntity<RoadmapResponseDto> create(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody RoadmapCreateDto dto) {

        Roadmap roadmap = new Roadmap();
        roadmap.setTitle(dto.getTitle());
        roadmap.setDescription(dto.getDescription());

        User author = new User();
        author.setId(principal.userId());
        roadmap.setAuthor(author);
        roadmap.setModerationStatus(com.studywebsite.model.ModerationStatus.PENDING);
        if (tagService != null) {
            TagService.AppliedTags selected = tagService.resolveSelection(dto.getTagSelection(), List.of(), principal.userId());
            roadmap.setTags(selected.tags());
        }

        Roadmap saved = roadmapService.create(roadmap);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + saved.getId()))
                .body(toResponseDtoWithTree(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> update(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody RoadmapUpdateDto dto) {

        Roadmap existing = roadmapService.getById(id);
        requireOwner(existing, principal.userId());
        if (dto.getTitle() != null) {
            existing.setTitle(dto.getTitle());
        }
        if (dto.getDescription() != null) {
            existing.setDescription(dto.getDescription());
        }

        existing.setModerationStatus(com.studywebsite.model.ModerationStatus.PENDING);
        existing.setModerationNote(null);

        Roadmap saved = roadmapService.create(existing);
        return ResponseEntity.ok(toResponseDtoWithTree(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id) {
        requireOwner(roadmapService.getById(id), principal.userId());
        roadmapService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private RoadmapResponseDto toResponseDtoWithTree(Roadmap roadmap) {
        List<RoadmapNode> allNodes = roadmapNodeService.findByRoadmapId(roadmap.getId());
        Map<Long, List<RoadmapNode>> childrenByParent = allNodes.stream()
                .filter(node -> node.getParentStep() != null && node.getParentStep().getId() != null)
                .collect(Collectors.groupingBy(node -> node.getParentStep().getId()));

        List<RoadmapNodeResponseDto> rootNodes = allNodes.stream()
                .filter(node -> node.getParentStep() == null || node.getParentStep().getId() == null)
                .sorted((a, b) -> compareOrder(a.getOrderIndex(), b.getOrderIndex(), a.getId(), b.getId()))
                .map(node -> toNodeTreeDto(node, childrenByParent))
                .toList();

        Long authorId = roadmap.getAuthor() != null ? roadmap.getAuthor().getId() : null;
        String authorUsername = roadmap.getAuthor() != null ? roadmap.getAuthor().getUsername() : null;

        return RoadmapResponseDto.builder()
                .id(roadmap.getId())
                .authorId(authorId)
                .authorUsername(authorUsername)
                .title(roadmap.getTitle())
                .description(roadmap.getDescription())
                .createdAt(roadmap.getCreatedAt())
                .updatedAt(roadmap.getUpdatedAt())
                .nodes(rootNodes)
                .tags(roadmap.getTags() == null ? List.of() : roadmap.getTags().stream()
                        .map(com.studywebsite.model.ZitounaTag::getName)
                        .sorted()
                        .toList())
                .moderationStatus(roadmap.getModerationStatus() == null
                        ? com.studywebsite.model.ModerationStatus.APPROVED
                        : roadmap.getModerationStatus())
                .moderationNote(roadmap.getModerationNote())
                .build();
    }

    private RoadmapNodeResponseDto toNodeTreeDto(
            RoadmapNode node,
            Map<Long, List<RoadmapNode>> childrenByParent) {

        List<RoadmapNodeResponseDto> children = childrenByParent
                .getOrDefault(node.getId(), List.of())
                .stream()
                .sorted((a, b) -> compareOrder(a.getOrderIndex(), b.getOrderIndex(), a.getId(), b.getId()))
                .map(child -> toNodeTreeDto(child, childrenByParent))
                .toList();

        return RoadmapNodeResponseDto.builder()
                .id(node.getId())
                .roadmapId(node.getRoadmap() != null ? node.getRoadmap().getId() : null)
                .parentStepId(node.getParentStep() != null ? node.getParentStep().getId() : null)
                .title(node.getTitle())
                .content(node.getContent())
                .orderIndex(node.getOrderIndex())
                .childSteps(children)
                .build();
    }

    private int compareOrder(Integer leftOrder, Integer rightOrder, Long leftId, Long rightId) {
        int left = leftOrder != null ? leftOrder : Integer.MAX_VALUE;
        int right = rightOrder != null ? rightOrder : Integer.MAX_VALUE;
        int compare = Integer.compare(left, right);
        if (compare != 0) return compare;
        long leftValue = leftId != null ? leftId : Long.MAX_VALUE;
        long rightValue = rightId != null ? rightId : Long.MAX_VALUE;
        return Long.compare(leftValue, rightValue);
    }

    private void requireOwner(Roadmap roadmap, Long userId) {
        if (roadmap.getAuthor() == null || !userId.equals(roadmap.getAuthor().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can change this roadmap");
        }
    }
}

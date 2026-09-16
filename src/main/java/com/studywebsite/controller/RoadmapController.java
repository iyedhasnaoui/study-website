package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapCreateDto;
import com.studywebsite.dto.RoadmapResponseDto;
import com.studywebsite.dto.RoadmapUpdateDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.User;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roadmaps")
@RequiredArgsConstructor
public class RoadmapController {

    private final RoadmapService roadmapService;
    private final RoadmapGraphService roadmapGraphService;
    private final RoadmapMapper mapper;

    @GetMapping
    public ResponseEntity<List<RoadmapResponseDto>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long authorId) {

        List<Roadmap> roadmaps = roadmapService.getAll();

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

        return ResponseEntity.ok(roadmaps.stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(toDto(roadmapService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<RoadmapResponseDto> create(@Valid @RequestBody RoadmapCreateDto dto) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();

        Roadmap roadmap = new Roadmap();
        roadmap.setTitle(dto.getTitle());
        roadmap.setDescription(dto.getDescription());

        User author = new User();
        author.setId(principal.userId());
        roadmap.setAuthor(author);

        Roadmap saved = roadmapService.create(roadmap);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + saved.getId()))
                .body(toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> update(
            @PathVariable Long id,
            @Valid @RequestBody RoadmapUpdateDto dto) {

        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap existing = roadmapService.getById(id);
        roadmapService.assertCanEdit(existing, principal.userId());

        if (dto.getTitle() != null) {
            existing.setTitle(dto.getTitle());
        }
        if (dto.getDescription() != null) {
            existing.setDescription(dto.getDescription());
        }

        return ResponseEntity.ok(toDto(roadmapService.save(existing)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();
        roadmapService.assertCanEdit(roadmapService.getById(id), principal.userId());

        roadmapService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private RoadmapResponseDto toDto(Roadmap roadmap) {
        return mapper.toRoadmapDto(
                roadmap,
                roadmapGraphService.findNodes(roadmap.getId()),
                roadmapGraphService.findEdges(roadmap.getId()));
    }
}

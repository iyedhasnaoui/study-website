package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapCreateDto;
import com.studywebsite.dto.RoadmapResponseDto;
import com.studywebsite.dto.RoadmapUpdateDto;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.User;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.security.CurrentUser;
import com.studywebsite.service.RoadmapService;
import com.studywebsite.service.TagService;
import com.studywebsite.service.roadmap.RoadmapGraphService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @Autowired(required = false)
    private TagService tagService;

    @GetMapping
    public ResponseEntity<List<RoadmapResponseDto>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long authorId,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) String tag) {

        AuthenticatedUserPrincipal principal = CurrentUser.find().orElse(null);
        Long viewerId = principal != null ? principal.userId() : null;
        boolean isAdmin = principal != null && principal.isAdmin();


        // Fetch only visible roadmaps from DB instead of loading all into memory
        List<Roadmap> roadmaps = roadmapService.getVisibleRoadmaps(viewerId, isAdmin);

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

        if (tagIds != null && !tagIds.isEmpty()) {
            roadmaps = roadmaps.stream()
                    .filter(r -> r.getTags() != null && r.getTags().stream()
                            .anyMatch(t -> tagIds.contains(t.getId())))
                    .collect(Collectors.toList());
        }

        if (tag != null && !tag.isBlank()) {
            String tagName = tag.trim().toLowerCase();
            roadmaps = roadmaps.stream()
                    .filter(r -> r.getTags() != null && r.getTags().stream()
                            .anyMatch(t -> t.getName() != null && t.getName().toLowerCase().equals(tagName)))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(roadmaps.stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> getById(@PathVariable Long id) {
        Roadmap roadmap = roadmapService.getById(id);
        Long viewerId = CurrentUser.find().map(AuthenticatedUserPrincipal::userId).orElse(null);

        if (!isVisibleTo(roadmap, viewerId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toDto(roadmap));
    }

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @PostMapping
    public ResponseEntity<RoadmapResponseDto> create(@Valid @RequestBody RoadmapCreateDto dto) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();

        Roadmap roadmap = new Roadmap();
        roadmap.setTitle(dto.getTitle());
        roadmap.setDescription(dto.getDescription());

        User author = new User();
        author.setId(principal.userId());
        roadmap.setAuthor(author);
        roadmap.setModerationStatus(ModerationStatus.PENDING);

        if (tagService != null) {
            TagService.AppliedTags selected =
                    tagService.resolveSelection(dto.getTagSelection(), List.of(), principal.userId());
            roadmap.setTags(selected.tags());
        }

        Roadmap saved = roadmapService.create(roadmap);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + saved.getId()))
                .body(toDto(saved));
    }

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> update(
            @PathVariable Long id,
            @Valid @RequestBody RoadmapUpdateDto dto) {

        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap existing = roadmapService.getById(id);
        roadmapService.assertCanEdit(existing, principal);

        if (dto.getTitle() != null) {
            existing.setTitle(dto.getTitle());
        }
        if (dto.getDescription() != null) {
            existing.setDescription(dto.getDescription());
        }

        // An edit to published content goes back through moderation.
        existing.setModerationStatus(ModerationStatus.PENDING);
        existing.setModerationNote(null);

        return ResponseEntity.ok(toDto(roadmapService.save(existing)));
    }

    // Deleting whole roadmaps is reserved for ADMIN; contributors may not delete content.
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();
        roadmapService.assertCanEdit(roadmapService.getById(id), principal);

        roadmapService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Readers only see approved roadmaps, but an author keeps access to their own while it waits
     * for moderation — otherwise they could not open the roadmap they just created.
     */
    static boolean isVisibleTo(Roadmap roadmap, Long viewerId) {
        if (roadmap.getModerationStatus() == null
                || roadmap.getModerationStatus() == ModerationStatus.APPROVED) {
            return true;
        }
        return viewerId != null
                && roadmap.getAuthor() != null
                && viewerId.equals(roadmap.getAuthor().getId());
    }

    private RoadmapResponseDto toDto(Roadmap roadmap) {
        return mapper.toRoadmapDto(
                roadmap,
                roadmapGraphService.findNodes(roadmap.getId()),
                roadmapGraphService.findEdges(roadmap.getId()));
    }
}

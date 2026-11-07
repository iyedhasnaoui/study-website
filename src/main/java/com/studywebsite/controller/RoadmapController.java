package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapCreateDto;
import com.studywebsite.dto.RoadmapResponseDto;
import com.studywebsite.dto.RoadmapUpdateDto;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.User;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.security.CurrentUser;
import com.studywebsite.service.RoadmapService;
import com.studywebsite.service.TagService;
import com.studywebsite.service.roadmap.RoadmapGraphService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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
    private final UserRepository userRepository;

    @Autowired(required = false)
    private TagService tagService;

    @GetMapping
    public ResponseEntity<Object> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long authorId,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {

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
            java.util.Set<Long> requested = java.util.Set.copyOf(tagIds);
            roadmaps = roadmaps.stream()
                    .filter(r -> r.getTags() != null && r.getTags().stream()
                            .map(t -> t.getId()).collect(java.util.stream.Collectors.toSet()).containsAll(requested))
                    .collect(Collectors.toList());
        }

        if (tag != null && !tag.isBlank()) {
            String tagName = tag.trim().toLowerCase();
            roadmaps = roadmaps.stream()
                    .filter(r -> r.getTags() != null && r.getTags().stream()
                            .anyMatch(t -> t.getName() != null && t.getName().toLowerCase().equals(tagName)))
                    .collect(Collectors.toList());
        }

        List<RoadmapResponseDto> dtos = roadmaps.stream().map(this::toDto).toList();
        if (page != null && size != null) {
            return ResponseEntity.ok(paginate(dtos, page, size));
        }
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> getById(@PathVariable Long id) {
        Roadmap roadmap = roadmapService.getByIdWithTags(id);
        AuthenticatedUserPrincipal principal = CurrentUser.find().orElse(null);

        if (!isVisibleTo(roadmap, principal)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toDto(roadmap));
    }

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @Transactional
    @PostMapping
    public ResponseEntity<RoadmapResponseDto> create(@Valid @RequestBody RoadmapCreateDto dto) {
        AuthenticatedUserPrincipal principal = CurrentUser.require();

        Roadmap roadmap = new Roadmap();
        roadmap.setTitle(dto.getTitle());
        roadmap.setDescription(dto.getDescription());

        User author = userRepository.findById(principal.userId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        roadmap.setAuthor(author);
        roadmap.setModerationStatus(ModerationStatus.PENDING);

        if (tagService != null) {
            TagService.AppliedTags selected =
                    tagService.resolveSelection(dto.getTagSelection(), List.of(), principal.userId());
            roadmap.setTags(selected.tags());
        }

        Roadmap saved = roadmapService.create(roadmap);
        return ResponseEntity.created(URI.create("/api/roadmaps/" + saved.getId()))
                .body(toDto(roadmapService.getByIdWithTags(saved.getId())));
    }

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> update(
            @PathVariable Long id,
            @Valid @RequestBody RoadmapUpdateDto dto) {

        AuthenticatedUserPrincipal principal = CurrentUser.require();
        Roadmap existing = roadmapService.getByIdWithTags(id);
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

        roadmapService.save(existing);
        return ResponseEntity.ok(toDto(roadmapService.getByIdWithTags(id)));
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
     * Readers see approved and legacy roadmaps; authors and administrators can also see
     * roadmaps awaiting moderation or rejected by a moderator.
     */
    static boolean isVisibleTo(Roadmap roadmap, AuthenticatedUserPrincipal principal) {
        if ((principal != null && principal.isAdmin())
                || roadmap.getModerationStatus() == null
                || roadmap.getModerationStatus() == ModerationStatus.APPROVED) {
            return true;
        }
        return principal != null
                && roadmap.getAuthor() != null
                && principal.userId().equals(roadmap.getAuthor().getId());
    }

    private RoadmapResponseDto toDto(Roadmap roadmap) {
        return mapper.toRoadmapDto(
                roadmap,
                roadmapGraphService.findNodes(roadmap.getId()),
                roadmapGraphService.findEdges(roadmap.getId()));
    }

    private <T> com.studywebsite.dto.zitouna.ZitounaDtos.PaginatedResponse<T> paginate(List<T> all, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.max(1, Math.min(size, 100));
        int from = p * s;
        int to = Math.min(from + s, all.size());
        List<T> content = from >= all.size() ? List.of() : all.subList(from, to);
        return new com.studywebsite.dto.zitouna.ZitounaDtos.PaginatedResponse<>(content, p, s, (long) all.size());
    }
}

package com.studywebsite.controller;

import com.studywebsite.dto.zitouna.ZitounaDtos;
import com.studywebsite.model.TagField;
import com.studywebsite.model.TagStatus;
import com.studywebsite.service.AdminGuard;
import com.studywebsite.service.TagService;
import com.studywebsite.service.ZitounaService;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class TagController {
    private final TagService tagService;
    private final AdminGuard adminGuard;
    private final ZitounaService zitounaService;

    @GetMapping("/api/tag-types")
    public List<ZitounaDtos.TagTypeResponse> listTypes() {
        return tagService.listTypes();
    }

    @PostMapping("/api/admin/tag-types")
    public ResponseEntity<ZitounaDtos.TagTypeResponse> createType(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ZitounaDtos.TagTypeRequest request
    ) {
        adminGuard.requireAdmin(principal.userId());
        ZitounaDtos.TagTypeResponse created = tagService.createType(request);
        return ResponseEntity.created(URI.create("/api/tag-types/" + created.id())).body(created);
    }

    @PutMapping("/api/admin/tag-types/{id}")
    public ZitounaDtos.TagTypeResponse updateType(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ZitounaDtos.TagTypeRequest request
    ) {
        adminGuard.requireAdmin(principal.userId());
        ZitounaDtos.TagTypeResponse updated = tagService.updateType(id, request);
        zitounaService.markContentThatBreaksCurrentTagRules();
        return updated;
    }

    @GetMapping("/api/tags")
    public List<ZitounaDtos.TagResponse> listTags(
            @RequestParam(required = false) TagStatus status,
            @RequestParam(required = false) TagField field,
            @RequestParam(required = false) String q
    ) {
        return tagService.listTags(status, field, q);
    }

    @PostMapping("/api/tags/proposals")
    public ResponseEntity<ZitounaDtos.TagResponse> propose(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ZitounaDtos.TagProposalRequest request
    ) {
        ZitounaDtos.TagResponse tag = tagService.propose(request, principal.userId());
        return ResponseEntity.created(URI.create("/api/tags/" + tag.id())).body(tag);
    }

    @GetMapping("/api/admin/tags/proposals")
    public List<ZitounaDtos.TagResponse> proposals(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        adminGuard.requireAdmin(principal.userId());
        return tagService.listTags(TagStatus.PROPOSED, null, null);
    }

    @PostMapping("/api/admin/tags/{id}/approve")
    public ZitounaDtos.TagResponse approve(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ZitounaDtos.TagDecisionRequest request
    ) {
        adminGuard.requireAdmin(principal.userId());
        return tagService.approve(id, request);
    }

    @PostMapping("/api/admin/tags/{id}/reject")
    public ZitounaDtos.TagResponse reject(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id,
            @RequestBody(required = false) ZitounaDtos.ModerationDecisionRequest request
    ) {
        adminGuard.requireAdmin(principal.userId());
        return tagService.reject(id, request);
    }
}

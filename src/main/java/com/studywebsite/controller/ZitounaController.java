package com.studywebsite.controller;

import com.studywebsite.dto.zitouna.ZitounaDtos;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Resource;
import com.studywebsite.service.AdminGuard;
import com.studywebsite.service.LearningMaterialStorageService;
import com.studywebsite.service.ZitounaService;
import com.studywebsite.service.ForumReplyService;
import com.studywebsite.service.media.ForumAttachmentService;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

@RestController
@RequiredArgsConstructor
public class ZitounaController {
    private final ZitounaService zitounaService;
    private final LearningMaterialStorageService materialStorageService;
    private final AdminGuard adminGuard;
    private final ForumReplyService forumReplyService;
    private final ForumAttachmentService forumAttachmentService;

    @GetMapping("/api/zitouna/feed")
    public Object feed(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Set<String> areas,
            @RequestParam(required = false) Set<Long> tagIds,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        List<ZitounaDtos.FeedItemResponse> all = zitounaService.feed(q, areas, tagIds);
        if (page != null && size != null) {
            return paginate(all, page, size);
        }
        return all;
    }

    @GetMapping("/api/learning-materials")
    public Object materials(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestParam(defaultValue = "false") boolean includeMine,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Set<Long> tagIds,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        List<ZitounaDtos.LearningMaterialResponse> all = zitounaService.listMaterials(includeMine && principal != null,
                principal == null ? null : principal.userId(), q, tagIds);
        if (page != null && size != null) {
            return paginate(all, page, size);
        }
        return all;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/api/admin/learning-materials/{id}")
    public ResponseEntity<Void> deleteLearningMaterial(@PathVariable Long id) {
        zitounaService.deleteLearningMaterial(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/api/learning-materials", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ZitounaDtos.LearningMaterialResponse> submitMaterial(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestPart("payload") ZitounaDtos.LearningMaterialRequest request,
            @RequestPart("file") MultipartFile file
    ) {
        ZitounaDtos.LearningMaterialResponse created = zitounaService.submitMaterial(request, file, principal.userId());
        return ResponseEntity.created(URI.create("/api/learning-materials/" + created.id())).body(created);
    }

    @GetMapping("/api/learning-materials/{id}/content")
    public ResponseEntity<FileSystemResource> materialContent(@PathVariable Long id) throws java.io.IOException {
        Resource material = zitounaService.requireMaterial(id);
        FileSystemResource resource = materialStorageService.load(material.getPath());
        String filename = material.getOriginalFilename() == null ? "material" : material.getOriginalFilename();
        MediaType contentType;
        try {
            contentType = MediaType.parseMediaType(material.getContentType());
        } catch (Exception ignored) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(contentType)
                .contentLength(material.getSizeBytes() == null ? resource.contentLength() : material.getSizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename*=UTF-8''" + java.net.URLEncoder.encode(filename, StandardCharsets.UTF_8))
                .body(resource);
    }

    @GetMapping("/api/faq")
    public Object faq(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Set<Long> tagIds,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        List<ZitounaDtos.FaqResponse> all = zitounaService.listFaq();
        if (page != null && size != null) {
            return paginate(all, page, size);
        }
        return all;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/faq")
    public ResponseEntity<ZitounaDtos.FaqResponse> createFaq(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ZitounaDtos.FaqRequest request
    ) {
//        adminGuard.requireAdmin(principal.userId());
        /// TODO :  ^FOR SECURITY REASONS WE MIGHT WANT TO BRING THIS BACK !!!
        ZitounaDtos.FaqResponse created = zitounaService.createFaq(request);
        return ResponseEntity.created(URI.create("/api/faq/" + created.id())).body(created);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @RequestMapping(value = "/api/admin/faq/{id}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ZitounaDtos.FaqResponse updateFaq(
            @PathVariable Long id,
            @RequestBody ZitounaDtos.FaqRequest request
    ) {
        return zitounaService.updateFaq(id, request);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/api/admin/faq/{id}")
    public ResponseEntity<Void> deleteFaq(@PathVariable Long id) {
        zitounaService.deleteFaq(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/api/admin/moderation")
    public List<ZitounaDtos.ModerationQueueItem> moderationQueue(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
//        adminGuard.requireAdmin(principal.userId());
        /// TODO:  ^FOR SECURITY REASONS WE MIGHT WANT TO BRING THIS BACK !!!
        return zitounaService.moderationQueue();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/moderation/{area}/{id}/{decision}")
    public ResponseEntity<Void> moderate(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable String area,
            @PathVariable Long id,
            @PathVariable String decision,
            @RequestBody(required = false) ZitounaDtos.ModerationDecisionRequest request
    ) {
//        adminGuard.requireAdmin(principal.userId());
        ///TODO:  ^FOR SECURITY REASONS WE MIGHT WANT TO BRING THIS BACK !!!
        ModerationStatus status = switch (decision.toLowerCase()) {
            case "approve" -> ModerationStatus.APPROVED;
            case "reject" -> ModerationStatus.REJECTED;
            case "needs-fixing" -> ModerationStatus.NEEDS_FIXING;
            default -> throw new IllegalArgumentException("Unknown moderation decision");
        };
        zitounaService.moderate(area, id, status, request == null ? null : request.note(),
                request == null ? null : request.version());
        return ResponseEntity.noContent().build();
    }
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/admin/users/{id}/ban")
    public ResponseEntity<Void> banUser(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id
    ) {
//        adminGuard.requireAdmin(principal.userId());
        zitounaService.setUserBanned(id, true);
        return ResponseEntity.noContent().build();
    }
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/api/admin/users/{id}/ban")
    public ResponseEntity<Void> unbanUser(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id
    ) {
//        adminGuard.requireAdmin(principal.userId());
        zitounaService.setUserBanned(id, false);
        return ResponseEntity.noContent().build();
    }
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/api/admin/forum/replies/{id}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id
    ) {
//        adminGuard.requireAdmin(principal.userId());
        forumReplyService.getById(id);
        forumAttachmentService.deleteForReply(id);
        forumReplyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private <T> ZitounaDtos.PaginatedResponse<T> paginate(List<T> all, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.max(1, Math.min(size, 100));
        int from = p * s;
        int to = Math.min(from + s, all.size());
        List<T> content = from >= all.size() ? List.of() : all.subList(from, to);
        return new ZitounaDtos.PaginatedResponse<>(content, p, s, (long) all.size());
    }
}

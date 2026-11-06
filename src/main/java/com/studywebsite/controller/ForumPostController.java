package com.studywebsite.controller;

import com.studywebsite.dto.ForumPostCreateDto;
import com.studywebsite.dto.ForumAttachmentResponseDto;
import com.studywebsite.dto.ForumPostResponseDto;
import com.studywebsite.dto.ForumPostUpdateDto;
import com.studywebsite.model.ForumPost;
import com.studywebsite.model.User;
import com.studywebsite.security.AuthenticatedUserPrincipal;
import com.studywebsite.service.ForumPostService;
import com.studywebsite.service.TagService;
import com.studywebsite.service.media.ForumAttachmentService;
import com.studywebsite.service.media.InvalidForumContributionException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forum/posts")
@RequiredArgsConstructor
public class ForumPostController {

    private final ForumPostService forumPostService;
    private final ForumAttachmentService forumAttachmentService;

    @Autowired(required = false)
    private TagService tagService;

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @Transactional
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ForumPostResponseDto> createPost(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ForumPostCreateDto dto) {

        requireTextOrFiles(dto.getContent(), List.of());
        return createPost(dto, principal.userId(), List.of());
    }

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @Transactional
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ForumPostResponseDto> createPostWithMedia(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestPart("payload") ForumPostCreateDto dto,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        List<MultipartFile> safeFiles = files == null ? List.of() : files;
        requireTextOrFiles(dto.getContent(), safeFiles);
        return createPost(dto, principal.userId(), safeFiles);
    }

    @GetMapping
    public ResponseEntity<Object> getAll(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        Long viewerId = principal != null ? principal.userId() : null;
        List<ForumPost> posts = forumPostService.getAll().stream()
                .filter(post -> isVisibleTo(post, viewerId))
                .toList();

        if (q != null && !q.isBlank()) {
            String query = q.trim().toLowerCase();
            posts = posts.stream()
                    .filter(p -> p.getTitle() != null && p.getTitle().toLowerCase().contains(query))
                    .collect(Collectors.toList());
        }

        if (tagIds != null && !tagIds.isEmpty()) {
            posts = posts.stream()
                    .filter(p -> p.getTags() != null && p.getTags().stream()
                            .anyMatch(t -> tagIds.contains(t.getId())))
                    .collect(Collectors.toList());
        }

        if (tag != null && !tag.isBlank()) {
            String tagName = tag.trim().toLowerCase();
            posts = posts.stream()
                    .filter(p -> p.getTags() != null && p.getTags().stream()
                            .anyMatch(t -> t.getName() != null && t.getName().toLowerCase().equals(tagName)))
                    .collect(Collectors.toList());
        }

        List<ForumPostResponseDto> dtos = posts.stream().map(this::toResponseDto).collect(Collectors.toList());
        if (page != null && size != null) {
            return ResponseEntity.ok(paginate(dtos, page, size));
        }
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ForumPostResponseDto> getById(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id
    ) {
        ForumPost post = forumPostService.getById(id);
        Long viewerId = principal != null ? principal.userId() : null;
        if (!isVisibleTo(post, viewerId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toResponseDto(post));
    }

    /** Returns true when the post is published, or when the viewer is the author. */
    private boolean isVisibleTo(ForumPost post, Long viewerId) {
        if (post.getModerationStatus() == null
                || post.getModerationStatus() == com.studywebsite.model.ModerationStatus.APPROVED) {
            return true;
        }
        // Show non-published posts to their author
        if (viewerId != null && post.getAuthor() != null
                && viewerId.equals(post.getAuthor().getId())) {
            return true;
        }
        return false;
    }

    @PreAuthorize("hasAnyRole('VIEWER','CONTRIBUTOR','ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ForumPostResponseDto> update(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ForumPostUpdateDto dto) {

        ForumPost existing = forumPostService.getById(id);
        requireOwner(existing, principal);

        if (existing.getModerationStatus() == com.studywebsite.model.ModerationStatus.REJECTED) {
            throw new InvalidForumContributionException("Rejected posts cannot be edited");
        }

        String baseTitle = existing.getRevisionStatus() == null ? existing.getTitle() : existing.getPendingTitle();
        String baseContent = existing.getRevisionStatus() == null ? existing.getContent() : existing.getPendingContent();
        String title = dto.getTitle() == null ? baseTitle : dto.getTitle().strip();
        String content = dto.getContent() == null ? baseContent : dto.getContent().strip();
        if (title == null || title.length() < 5) {
            throw new InvalidForumContributionException("Post title must contain at least 5 characters");
        }
        if (dto.getContent() != null) {
            if (content.isBlank() && (existing.getAttachments() == null || existing.getAttachments().isEmpty())) {
                throw new InvalidForumContributionException("Write a message or attach a PDF, audio, or video file");
            }
        }

        if (existing.getModerationStatus() == null
                || existing.getModerationStatus() == com.studywebsite.model.ModerationStatus.APPROVED) {
            existing.setPendingTitle(title);
            existing.setPendingContent(content);
            existing.setRevisionStatus(com.studywebsite.model.ModerationStatus.PENDING);
            existing.setRevisionNote(null);
        } else {
            existing.setTitle(title);
            existing.setContent(content);
            existing.setModerationStatus(com.studywebsite.model.ModerationStatus.PENDING);
            existing.setModerationNote(null);
        }

            ForumPost saved = forumPostService.create(existing);
            return ResponseEntity.ok(toResponseDto(saved));
        }

    @PreAuthorize("hasAnyRole('CONTRIBUTOR','ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id) {
        requireOwner(forumPostService.getById(id), principal);
        forumAttachmentService.deleteForPostTree(id);
        forumPostService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private ForumPostResponseDto toResponseDto(ForumPost p) {
        if (p == null) return null;
        Long authorId = null;
        String authorUsername = null;
        if (p.getAuthor() != null) {
            authorId = p.getAuthor().getId();
            authorUsername = p.getAuthor().getUsername();
        }

        return ForumPostResponseDto.builder()
                .id(p.getId())
                .title(p.getRevisionStatus() != null ? p.getPendingTitle() : p.getTitle())
                .content(p.getRevisionStatus() != null ? p.getPendingContent() : p.getContent())
                .authorId(authorId)
                .authorUsername(authorUsername)
                .tags(p.getTags() == null ? Collections.emptyList() : p.getTags().stream()
                        .map(com.studywebsite.model.ZitounaTag::getName)
                        .sorted()
                        .toList())
                .moderationStatus(p.getRevisionStatus() != null
                        ? p.getRevisionStatus()
                        : (p.getModerationStatus() == null
                                ? com.studywebsite.model.ModerationStatus.APPROVED
                                : p.getModerationStatus()))
                .moderationNote(p.getRevisionStatus() != null ? p.getRevisionNote() : p.getModerationNote())
                .attachments(p.getAttachments() == null ? List.of() : p.getAttachments().stream()
                        .map(ForumAttachmentResponseDto::from)
                        .toList())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private ResponseEntity<ForumPostResponseDto> createPost(
            ForumPostCreateDto dto,
            Long userId,
            List<MultipartFile> files
    ) {
        ForumPost toSave = new ForumPost();
        toSave.setTitle(dto.getTitle().strip());
        toSave.setContent(dto.getContent() == null ? "" : dto.getContent().strip());
        User author = new User();
        author.setId(userId);
        toSave.setAuthor(author);
        toSave.setModerationStatus(com.studywebsite.model.ModerationStatus.PENDING);

        if (tagService != null) {
            TagService.AppliedTags selected = tagService.resolveSelection(dto.getTagSelection(), dto.getTags(), userId);
            toSave.setTags(selected.tags());
            toSave.setHomeInstitution(selected.homeInstitution());
            toSave.setPartnerInstitution(selected.partnerInstitution());
        }

        ForumPost saved = forumPostService.create(toSave);
        saved.getAttachments().addAll(forumAttachmentService.attachToPost(saved, files));
        ForumPostResponseDto response = toResponseDto(saved);
        return ResponseEntity.created(URI.create("/api/forum/posts/" + saved.getId())).body(response);
    }

    private void requireTextOrFiles(String content, List<MultipartFile> files) {
        if ((content == null || content.isBlank()) && files.isEmpty()) {
            throw new InvalidForumContributionException("Write a message or attach a PDF, audio, or video file");
        }
    }

    /** Admins may act on anyone's content; everyone else only on their own. */
    private void requireOwner(ForumPost post, AuthenticatedUserPrincipal principal) {
        if (principal.isAdmin()) {
            return;
        }
        if (post.getAuthor() == null || !principal.userId().equals(post.getAuthor().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can change this post");
        }
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


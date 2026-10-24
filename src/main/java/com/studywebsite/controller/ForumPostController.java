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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ForumPostResponseDto> createPost(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ForumPostCreateDto dto) {

        requireTextOrFiles(dto.getContent(), List.of());
        return createPost(dto, principal.userId(), List.of());
    }

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
    public ResponseEntity<List<ForumPostResponseDto>> getAll(@RequestParam(required = false) String tag) {
        // Tag filtering isn't currently supported at the entity level; return all posts and ignore tag if provided
        List<ForumPost> posts = forumPostService.getAll().stream()
                .filter(post -> post.getModerationStatus() == null
                        || post.getModerationStatus() == com.studywebsite.model.ModerationStatus.APPROVED)
                .toList();
        List<ForumPostResponseDto> dtos = posts.stream().map(this::toResponseDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ForumPostResponseDto> getById(@PathVariable Long id) {
        ForumPost post = forumPostService.getById(id);
        if (post.getModerationStatus() != null
                && post.getModerationStatus() != com.studywebsite.model.ModerationStatus.APPROVED) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toResponseDto(post));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ForumPostResponseDto> update(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ForumPostUpdateDto dto) {

        ForumPost existing = forumPostService.getById(id);
        requireOwner(existing, principal.userId());

        // Optionally, you might want to check that the updating user is the author; omitted for simplicity
        if (dto.getTitle() != null) {
            existing.setTitle(dto.getTitle().strip());
        }
        if (dto.getContent() != null) {
            String content = dto.getContent().strip();
            if (content.isBlank() && (existing.getAttachments() == null || existing.getAttachments().isEmpty())) {
                throw new InvalidForumContributionException("Write a message or attach a PDF, audio, or video file");
            }
            existing.setContent(content);
        }

        existing.setModerationStatus(com.studywebsite.model.ModerationStatus.PENDING);
        existing.setModerationNote(null);

        ForumPost saved = forumPostService.create(existing);
        return ResponseEntity.ok(toResponseDto(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id) {
        requireOwner(forumPostService.getById(id), principal.userId());
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
                .title(p.getTitle())
                .content(p.getContent())
                .authorId(authorId)
                .authorUsername(authorUsername)
                .tags(p.getTags() == null ? Collections.emptyList() : p.getTags().stream()
                        .map(com.studywebsite.model.ZitounaTag::getName)
                        .sorted()
                        .toList())
                .moderationStatus(p.getModerationStatus() == null
                        ? com.studywebsite.model.ModerationStatus.APPROVED
                        : p.getModerationStatus())
                .moderationNote(p.getModerationNote())
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

    private void requireOwner(ForumPost post, Long userId) {
        if (post.getAuthor() == null || !userId.equals(post.getAuthor().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can change this post");
        }
    }
}


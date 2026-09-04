package com.studywebsite.controller;

import com.studywebsite.dto.ForumReplyCreateDto;
import com.studywebsite.dto.ForumAttachmentResponseDto;
import com.studywebsite.dto.ForumReplyResponseDto;
import com.studywebsite.dto.ForumReplyUpdateDto;
import com.studywebsite.model.ForumReply;
import com.studywebsite.model.User;
import com.studywebsite.service.ForumReplyService;
import com.studywebsite.service.media.ForumAttachmentService;
import com.studywebsite.service.media.InvalidForumContributionException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forum/posts/{postId}/replies")
@RequiredArgsConstructor
public class ForumReplyController {

    private final ForumReplyService forumReplyService;
    private final ForumAttachmentService forumAttachmentService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ForumReplyResponseDto> createReply(
            @PathVariable Long postId,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
            @Valid @RequestBody ForumReplyCreateDto dto) {

        requireTextOrFiles(dto.getContent(), List.of());
        return createReply(postId, userId, dto, List.of());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ForumReplyResponseDto> createReplyWithMedia(
            @PathVariable Long postId,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
            @Valid @RequestPart("payload") ForumReplyCreateDto dto,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        List<MultipartFile> safeFiles = files == null ? List.of() : files;
        requireTextOrFiles(dto.getContent(), safeFiles);
        return createReply(postId, userId, dto, safeFiles);
    }

    @GetMapping
    public ResponseEntity<List<ForumReplyResponseDto>> getRepliesByPost(@PathVariable Long postId) {
        List<ForumReply> replies = forumReplyService.findByPostId(postId);
        List<ForumReplyResponseDto> dtos = replies.stream().map(this::toResponseDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{replyId}")
    public ResponseEntity<ForumReplyResponseDto> getReplyById(
            @PathVariable Long postId,
            @PathVariable Long replyId) {
        ForumReply reply = forumReplyService.getById(replyId);
        // Verify the reply belongs to the specified post
        if (!reply.getPost().getId().equals(postId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toResponseDto(reply));
    }

    @PutMapping("/{replyId}")
    public ResponseEntity<ForumReplyResponseDto> updateReply(
            @PathVariable Long postId,
            @PathVariable Long replyId,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
            @Valid @RequestBody ForumReplyUpdateDto dto) {

        ForumReply existing = forumReplyService.getById(replyId);
        
        // Verify the reply belongs to the specified post
        if (!existing.getPost().getId().equals(postId)) {
            return ResponseEntity.notFound().build();
        }

        // Optionally, you might want to check that the updating user is the author; omitted for simplicity
        if (dto.getContent() != null) {
            String content = dto.getContent().strip();
            if (content.isBlank() && (existing.getAttachments() == null || existing.getAttachments().isEmpty())) {
                throw new InvalidForumContributionException("Write a reply or attach a PDF, audio, or video file");
            }
            existing.setContent(content);
        }

        ForumReply saved = forumReplyService.create(existing);
        return ResponseEntity.ok(toResponseDto(saved));
    }

    @DeleteMapping("/{replyId}")
    public ResponseEntity<Void> deleteReply(
            @PathVariable Long postId,
            @PathVariable Long replyId) {
        ForumReply reply = forumReplyService.getById(replyId);
        
        // Verify the reply belongs to the specified post
        if (!reply.getPost().getId().equals(postId)) {
            return ResponseEntity.notFound().build();
        }
        
        forumAttachmentService.deleteForReply(replyId);
        forumReplyService.delete(replyId);
        return ResponseEntity.noContent().build();
    }

    private ForumReplyResponseDto toResponseDto(ForumReply r) {
        if (r == null) return null;
        Long postId = null;
        Long authorId = null;
        String authorUsername = null;
        if (r.getPost() != null) {
            postId = r.getPost().getId();
        }
        if (r.getAuthor() != null) {
            authorId = r.getAuthor().getId();
            authorUsername = r.getAuthor().getUsername();
        }

        return ForumReplyResponseDto.builder()
                .id(r.getId())
                .postId(postId)
                .content(r.getContent())
                .authorId(authorId)
                .authorUsername(authorUsername)
                .attachments(r.getAttachments() == null ? List.of() : r.getAttachments().stream()
                        .map(ForumAttachmentResponseDto::from)
                        .toList())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    private ResponseEntity<ForumReplyResponseDto> createReply(
            Long postId,
            Long userId,
            ForumReplyCreateDto dto,
            List<MultipartFile> files
    ) {
        ForumReply toSave = new ForumReply();
        toSave.setContent(dto.getContent() == null ? "" : dto.getContent().strip());

        com.studywebsite.model.ForumPost post = new com.studywebsite.model.ForumPost();
        post.setId(postId);
        toSave.setPost(post);
        User author = new User();
        author.setId(userId);
        toSave.setAuthor(author);

        ForumReply saved = forumReplyService.create(toSave);
        saved.getAttachments().addAll(forumAttachmentService.attachToReply(saved, files));
        ForumReplyResponseDto response = toResponseDto(saved);
        return ResponseEntity.created(URI.create("/api/forum/posts/" + postId + "/replies/" + saved.getId())).body(response);
    }

    private void requireTextOrFiles(String content, List<MultipartFile> files) {
        if ((content == null || content.isBlank()) && files.isEmpty()) {
            throw new InvalidForumContributionException("Write a reply or attach a PDF, audio, or video file");
        }
    }
}



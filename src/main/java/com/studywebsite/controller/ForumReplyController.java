package com.studywebsite.controller;

import com.studywebsite.dto.ForumReplyCreateDto;
import com.studywebsite.dto.ForumReplyResponseDto;
import com.studywebsite.dto.ForumReplyUpdateDto;
import com.studywebsite.model.ForumReply;
import com.studywebsite.model.User;
import com.studywebsite.service.ForumReplyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forum/posts/{postId}/replies")
@RequiredArgsConstructor
public class ForumReplyController {

    private final ForumReplyService forumReplyService;

    @PostMapping
    public ResponseEntity<ForumReplyResponseDto> createReply(
            @PathVariable Long postId,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
            @Valid @RequestBody ForumReplyCreateDto dto) {

        ForumReply toSave = new ForumReply();
        toSave.setContent(dto.getContent());
        
        // Create a minimal post reference (only use id for relation)
        com.studywebsite.model.ForumPost post = new com.studywebsite.model.ForumPost();
        post.setId(postId);
        toSave.setPost(post);
        
        // set minimal author reference (service/repository will only use id for relation)
        User author = new User();
        author.setId(userId);
        toSave.setAuthor(author);

        ForumReply saved = forumReplyService.create(toSave);

        ForumReplyResponseDto response = toResponseDto(saved);

        return ResponseEntity.created(URI.create("/api/forum/posts/" + postId + "/replies/" + saved.getId())).body(response);
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
            existing.setContent(dto.getContent());
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
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}



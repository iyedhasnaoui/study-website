package com.studywebsite.controller;

import com.studywebsite.dto.ForumPostCreateDto;
import com.studywebsite.dto.ForumPostResponseDto;
import com.studywebsite.dto.ForumPostUpdateDto;
import com.studywebsite.model.ForumPost;
import com.studywebsite.model.User;
import com.studywebsite.service.ForumPostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forum/posts")
@RequiredArgsConstructor
public class ForumPostController {

    private final ForumPostService forumPostService;

    @PostMapping
    public ResponseEntity<ForumPostResponseDto> createPost(
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
            @Valid @RequestBody ForumPostCreateDto dto) {

        ForumPost toSave = new ForumPost();
        toSave.setTitle(dto.getTitle());
        toSave.setContent(dto.getContent());
        // set minimal author reference (service/repository will only use id for relation)
        User author = new User();
        author.setId(userId);
        toSave.setAuthor(author);

        ForumPost saved = forumPostService.create(toSave);

        ForumPostResponseDto response = toResponseDto(saved);

        return ResponseEntity.created(URI.create("/api/forum/posts/" + saved.getId())).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ForumPostResponseDto>> getAll(@RequestParam(required = false) String tag) {
        // Tag filtering isn't currently supported at the entity level; return all posts and ignore tag if provided
        List<ForumPost> posts = forumPostService.getAll();
        List<ForumPostResponseDto> dtos = posts.stream().map(this::toResponseDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ForumPostResponseDto> getById(@PathVariable Long id) {
        ForumPost post = forumPostService.getById(id);
        return ResponseEntity.ok(toResponseDto(post));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ForumPostResponseDto> update(
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody ForumPostUpdateDto dto) {

        ForumPost existing = forumPostService.getById(id);

        // Optionally, you might want to check that the updating user is the author; omitted for simplicity
        if (dto.getTitle() != null) existing.setTitle(dto.getTitle());
        if (dto.getContent() != null) existing.setContent(dto.getContent());

        ForumPost saved = forumPostService.create(existing);
        return ResponseEntity.ok(toResponseDto(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
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
                .tags(Collections.emptyList())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}


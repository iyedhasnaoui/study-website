package com.studywebsite.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForumReplyResponseDto {
    private Long id;
    private Long postId;
    private String content;
    private Long authorId;
    private String authorUsername;
    private List<ForumAttachmentResponseDto> attachments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


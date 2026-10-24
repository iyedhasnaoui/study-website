package com.studywebsite.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import com.studywebsite.model.ModerationStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForumPostResponseDto {
    private Long id;
    private String title;
    private String content;
    private Long authorId;
    private String authorUsername;
    private List<String> tags;
    private ModerationStatus moderationStatus;
    private String moderationNote;
    private List<ForumAttachmentResponseDto> attachments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


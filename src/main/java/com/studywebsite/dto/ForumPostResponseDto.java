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
public class ForumPostResponseDto {
    private Long id;
    private String title;
    private String content;
    private Long authorId;
    private String authorUsername;

    private Long topicId;
    private String topicName;
    private String topicSlug;
    private String topicIcon;

    private List<String> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


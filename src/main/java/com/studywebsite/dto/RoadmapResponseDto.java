package com.studywebsite.dto;

import com.studywebsite.model.ModerationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapResponseDto {
    private Long id;
    private Long authorId;
    private String authorUsername;
    private String title;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<RoadmapNodeResponseDto> nodes = new ArrayList<>();

    @Builder.Default
    private List<RoadmapEdgeResponseDto> edges = new ArrayList<>();

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    private ModerationStatus moderationStatus;
    private String moderationNote;
}

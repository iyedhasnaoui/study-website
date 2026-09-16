package com.studywebsite.dto;

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
public class RoadmapGraphResponseDto {
    private Long roadmapId;
    private String title;
    private String description;
    private Long authorId;
    private String authorUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<RoadmapNodeResponseDto> nodes = new ArrayList<>();

    @Builder.Default
    private List<RoadmapEdgeResponseDto> edges = new ArrayList<>();
}

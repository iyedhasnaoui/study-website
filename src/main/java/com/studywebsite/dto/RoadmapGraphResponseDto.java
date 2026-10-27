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
public class RoadmapGraphResponseDto {
    private Long roadmapId;
    private String title;
    private String description;
    private Long authorId;
    private String authorUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private ModerationStatus moderationStatus;
    private String moderationNote;

    @Builder.Default
    private List<RoadmapNodeResponseDto> nodes = new ArrayList<>();

    @Builder.Default
    private List<RoadmapEdgeResponseDto> edges = new ArrayList<>();

    /** Non-blocking guidance, such as the nudge to split a roadmap that is getting large. */
    @Builder.Default
    private List<String> advisories = new ArrayList<>();
}

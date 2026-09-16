package com.studywebsite.dto;

import com.studywebsite.model.RoadmapNodeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapNodeResponseDto {
    private Long id;
    private Long roadmapId;
    private String title;
    private String description;
    private String content;
    private RoadmapNodeType nodeType;
    private Double positionX;
    private Double positionY;
}

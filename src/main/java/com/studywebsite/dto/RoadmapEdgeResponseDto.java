package com.studywebsite.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapEdgeResponseDto {
    private Long id;
    private Long roadmapId;
    private Long sourceNodeId;
    private Long targetNodeId;
}

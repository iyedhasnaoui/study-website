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
public class RoadmapNodeResponseDto {
    private Long id;
    private Long roadmapId;
    private Long parentStepId;
    private String title;
    private String content;
    private Integer orderIndex;
    private List<RoadmapNodeResponseDto> childSteps = new ArrayList<>();
}
package com.studywebsite.dto;

import com.studywebsite.model.RoadmapNodeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

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
    private Boolean gate;
    private Long linkedRoadmapId;

    /** Only filled when the whole graph is read; list endpoints leave it empty. */
    @Builder.Default
    private List<RoadmapNodeLinkDto> links = new ArrayList<>();

    /** Readers only receive accepted vouches; the roadmap's editors see every one with its status. */
    @Builder.Default
    private List<RoadmapNodeVouchDto> vouches = new ArrayList<>();
}

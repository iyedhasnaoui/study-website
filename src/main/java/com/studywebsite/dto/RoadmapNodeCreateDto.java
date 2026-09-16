package com.studywebsite.dto;

import com.studywebsite.model.RoadmapNodeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RoadmapNodeCreateDto {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 500)
    private String description;

    @Size(max = 100000)
    private String content;

    private RoadmapNodeType nodeType;

    private Double positionX;

    private Double positionY;
}

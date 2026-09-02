package com.studywebsite.dto;

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

    @Size(max = 100000)
    private String content;

    private Long parentStepId;

    private Integer orderIndex;
}
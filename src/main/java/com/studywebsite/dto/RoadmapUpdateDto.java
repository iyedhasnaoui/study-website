package com.studywebsite.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RoadmapUpdateDto {

    @Size(max = 200)
    private String title;

    @Size(max = 100000)
    private String description;
}
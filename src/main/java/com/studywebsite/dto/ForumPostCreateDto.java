package com.studywebsite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForumPostCreateDto {

    @NotBlank
    @Size(min = 5, max = 150)
    private String title;

    @NotBlank
    @Size(min = 10, max = 10000)
    private String content;

    private Long topicId;

    private List<String> tags;
}


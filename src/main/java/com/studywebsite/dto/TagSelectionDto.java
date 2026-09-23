package com.studywebsite.dto;

import jakarta.validation.Valid;
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
public class TagSelectionDto {
    private Long homeInstitutionId;
    private Long partnerInstitutionId;

    @Builder.Default
    private List<Long> institutionIds = new ArrayList<>();

    @Builder.Default
    private List<Long> programIds = new ArrayList<>();

    @Builder.Default
    private List<Long> topicIds = new ArrayList<>();

    @Builder.Default
    private List<Long> subtopicIds = new ArrayList<>();

    @Valid
    @Builder.Default
    private List<TagProposalDto> proposals = new ArrayList<>();
}

package com.studywebsite.dto;

import com.studywebsite.model.ModerationStatus;

public record RoadmapNodeVouchDto(
        Long id,
        String personName,
        String note,
        ModerationStatus status
) {
}

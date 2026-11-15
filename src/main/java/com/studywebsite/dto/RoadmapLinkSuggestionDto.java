package com.studywebsite.dto;

import com.studywebsite.model.RoadmapLinkTarget;

/** Published Zitun content carrying the same tags as a roadmap, offered for linking from its nodes. */
public record RoadmapLinkSuggestionDto(
        RoadmapLinkTarget targetType,
        Long targetId,
        String title,
        Integer replyCount
) {
}

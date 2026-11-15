package com.studywebsite.dto;

import com.studywebsite.model.RoadmapLinkKind;
import com.studywebsite.model.RoadmapLinkTarget;

/**
 * A node's link as the panel shows it.
 *
 * @param label      the target's current title for an internal link, the page title for an external one
 * @param insideTag  true when the target is Zitun content carrying every tag of the roadmap
 * @param available  false when the internal target was deleted or is not published (any more)
 * @param replyCount number of replies when the target is a forum thread, otherwise null
 */
public record RoadmapNodeLinkDto(
        Long id,
        RoadmapLinkKind kind,
        RoadmapLinkTarget targetType,
        Long targetId,
        String url,
        String label,
        boolean insideTag,
        boolean available,
        Integer replyCount
) {
}

package com.studywebsite.dto.zitouna;

import com.studywebsite.dto.TagSelectionDto;
import com.studywebsite.model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class ZitounaDtos {
    private ZitounaDtos() {
    }

    public record TagTypeResponse(
            Long id,
            String name,
            TagField field,
            Integer minimumInstitutions,
            Integer minimumPrograms,
            Boolean active
    ) {
    }

    public record TagTypeRequest(
            @NotBlank @Size(max = 80) String name,
            @NotNull TagField field,
            @Min(0) @Max(10) Integer minimumInstitutions,
            @Min(0) @Max(10) Integer minimumPrograms,
            Boolean active
    ) {
    }

    public record TagResponse(
            Long id,
            String name,
            TagField field,
            String type,
            Long parentId,
            String parentName,
            TagStatus status,
            List<String> aliases,
            String decisionReason
    ) {
    }

    public record TagProposalRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull TagField field,
            Long parentId
    ) {
    }

    public record TagDecisionRequest(
            @NotNull Long typeId,
            List<@Size(max = 120) String> aliases,
            @Size(max = 1000) String reason
    ) {
    }

    public record FeedItemResponse(
            String area,
            Long id,
            String title,
            String excerpt,
            Long authorId,
            String authorUsername,
            LocalDateTime updatedAt,
            ModerationStatus moderationStatus,
            List<TagResponse> tags,
            String contentUrl
    ) {
    }

    public record LearningMaterialRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 5000) String description,
            @NotNull ResourceType type,
            @Size(max = 120) String gradeNote,
            @Size(max = 3000) String solutionApproach,
            @Size(max = 3000) String methodUsed,
            @Size(max = 3000) String roadmapFollowed,
            @Valid TagSelectionDto tags
    ) {
    }

    public record LearningMaterialResponse(
            Long id,
            String title,
            String description,
            ResourceType type,
            String originalFilename,
            String contentType,
            Long sizeBytes,
            String gradeNote,
            String solutionApproach,
            String methodUsed,
            String roadmapFollowed,
            Long authorId,
            String authorUsername,
            ModerationStatus moderationStatus,
            List<TagResponse> tags,
            String contentUrl,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    public record FaqRequest(
            @NotBlank @Size(max = 300) String question,
            @NotBlank @Size(max = 10000) String answer,
            Boolean published
    ) {
    }

    public record FaqResponse(
            Long id,
            String question,
            String answer,
            Boolean published,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    public record ModerationDecisionRequest(
            @Size(max = 2000) String note
    ) {
    }

    public record ModerationQueueItem(
            String area,
            Long id,
            String title,
            Long authorId,
            String authorUsername,
            ModerationStatus status,
            LocalDateTime submittedAt,
            Map<String, Object> details
    ) {
    }
}

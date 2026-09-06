package com.studywebsite.dto;

import com.studywebsite.model.ForumAttachment;
import com.studywebsite.model.ForumAttachmentType;

import java.time.LocalDateTime;

public record ForumAttachmentResponseDto(
        Long id,
        String filename,
        String mimeType,
        ForumAttachmentType type,
        Long sizeBytes,
        String contentUrl,
        LocalDateTime createdAt
) {
    public static ForumAttachmentResponseDto from(ForumAttachment attachment) {
        return new ForumAttachmentResponseDto(
                attachment.getId(),
                attachment.getOriginalFilename(),
                attachment.getMimeType(),
                attachment.getType(),
                attachment.getSizeBytes(),
                "/api/forum/attachments/" + attachment.getId() + "/content",
                attachment.getCreatedAt()
        );
    }
}

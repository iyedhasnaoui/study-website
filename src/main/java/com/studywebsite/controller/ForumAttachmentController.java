package com.studywebsite.controller;

import com.studywebsite.service.media.ForumAttachmentService;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@RestController
@RequestMapping("/api/forum/attachments")
public class ForumAttachmentController {

    private final ForumAttachmentService attachmentService;

    public ForumAttachmentController(ForumAttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping("/{attachmentId}/content")
    public ResponseEntity<org.springframework.core.io.Resource> getContent(@PathVariable Long attachmentId) {
        ForumAttachmentService.AttachmentDownload download = attachmentService.loadForDownload(attachmentId);
        MediaType contentType;
        try {
            contentType = MediaType.parseMediaType(download.metadata().getMimeType());
        } catch (IllegalArgumentException ignored) {
            contentType = MediaType.APPLICATION_OCTET_STREAM;
        }

        ContentDisposition disposition = ContentDisposition.inline()
                .filename(download.metadata().getOriginalFilename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(contentType)
                .contentLength(download.metadata().getSizeBytes())
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(download.resource());
    }
}

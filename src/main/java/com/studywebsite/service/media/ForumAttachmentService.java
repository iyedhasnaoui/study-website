package com.studywebsite.service.media;

import com.studywebsite.model.ForumAttachment;
import com.studywebsite.model.ForumPost;
import com.studywebsite.model.ForumReply;
import com.studywebsite.repository.ForumAttachmentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class ForumAttachmentService {

    public static final int MAX_ATTACHMENTS_PER_CONTRIBUTION = 5;

    private final ForumAttachmentRepository attachmentRepository;
    private final ForumAttachmentStorageService storageService;

    public ForumAttachmentService(
            ForumAttachmentRepository attachmentRepository,
            ForumAttachmentStorageService storageService
    ) {
        this.attachmentRepository = attachmentRepository;
        this.storageService = storageService;
    }

    @Transactional
    public List<ForumAttachment> attachToPost(ForumPost post, List<MultipartFile> files) {
        validateFileCount(files);
        if (files == null || files.isEmpty()) return List.of();

        List<ForumAttachmentStorageService.StoredFile> storedFiles = new ArrayList<>();
        try {
            List<ForumAttachment> attachments = files.stream().map(file -> {
                ForumAttachmentStorageService.StoredFile stored = storageService.store(file);
                storedFiles.add(stored);
                return ForumAttachment.builder()
                        .post(post)
                        .author(post.getAuthor())
                        .originalFilename(stored.originalFilename())
                        .storedFilename(stored.storedFilename())
                        .mimeType(stored.mimeType())
                        .type(stored.type())
                        .sizeBytes(stored.sizeBytes())
                        .build();
            }).toList();
            return attachmentRepository.saveAllAndFlush(attachments);
        } catch (RuntimeException exception) {
            storedFiles.forEach(stored -> safelyDelete(stored.storedFilename()));
            throw exception;
        }
    }

    @Transactional
    public List<ForumAttachment> attachToReply(ForumReply reply, List<MultipartFile> files) {
        validateFileCount(files);
        if (files == null || files.isEmpty()) return List.of();

        List<ForumAttachmentStorageService.StoredFile> storedFiles = new ArrayList<>();
        try {
            List<ForumAttachment> attachments = files.stream().map(file -> {
                ForumAttachmentStorageService.StoredFile stored = storageService.store(file);
                storedFiles.add(stored);
                return ForumAttachment.builder()
                        .reply(reply)
                        .author(reply.getAuthor())
                        .originalFilename(stored.originalFilename())
                        .storedFilename(stored.storedFilename())
                        .mimeType(stored.mimeType())
                        .type(stored.type())
                        .sizeBytes(stored.sizeBytes())
                        .build();
            }).toList();
            return attachmentRepository.saveAllAndFlush(attachments);
        } catch (RuntimeException exception) {
            storedFiles.forEach(stored -> safelyDelete(stored.storedFilename()));
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public AttachmentDownload loadForDownload(Long attachmentId) {
        ForumAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Forum attachment not found"));
        return new AttachmentDownload(attachment, storageService.load(attachment.getStoredFilename()));
    }

    @Transactional
    public void deleteForPostTree(Long postId) {
        deleteAttachments(attachmentRepository.findByPost_IdOrReply_Post_Id(postId, postId));
    }

    @Transactional
    public void deleteForReply(Long replyId) {
        deleteAttachments(attachmentRepository.findByReply_IdOrderByCreatedAtAsc(replyId));
    }

    private void deleteAttachments(List<ForumAttachment> attachments) {
        attachments.forEach(attachment -> storageService.delete(attachment.getStoredFilename()));
        attachmentRepository.deleteAll(attachments);
    }

    private void validateFileCount(List<MultipartFile> files) {
        if (files != null && files.size() > MAX_ATTACHMENTS_PER_CONTRIBUTION) {
            throw new InvalidForumAttachmentException("A contribution can contain at most five attachments");
        }
    }

    private void safelyDelete(String storedFilename) {
        try {
            storageService.delete(storedFilename);
        } catch (RuntimeException ignored) {
            // Preserve the original upload/database failure.
        }
    }

    public record AttachmentDownload(ForumAttachment metadata, Resource resource) {
    }
}

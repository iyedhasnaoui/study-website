package com.studywebsite.service.media;

import com.studywebsite.model.*;
import com.studywebsite.repository.ForumAttachmentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ForumAttachmentServiceTest {
    private final ForumAttachmentRepository repository = mock(ForumAttachmentRepository.class);
    private final ForumAttachmentStorageService storage = mock(ForumAttachmentStorageService.class);
    private final ForumAttachmentService service = new ForumAttachmentService(repository, storage);

    @Test void unpublishedPostMediaCannotBeDownloaded() {
        for (ModerationStatus status : new ModerationStatus[]{ModerationStatus.PENDING, ModerationStatus.REJECTED, ModerationStatus.NEEDS_FIXING}) {
            when(repository.findById(1L)).thenReturn(Optional.of(ForumAttachment.builder()
                    .post(ForumPost.builder().moderationStatus(status).build()).storedFilename("local.pdf").build()));
            assertThatThrownBy(() -> service.loadForDownload(1L)).isInstanceOf(EntityNotFoundException.class);
        }
        verifyNoInteractions(storage);
    }
    @Test void replyMediaOnPendingPostCannotBeDownloaded() {
        when(repository.findById(1L)).thenReturn(Optional.of(ForumAttachment.builder()
                .reply(ForumReply.builder().post(ForumPost.builder().moderationStatus(ModerationStatus.PENDING).build()).build())
                .storedFilename("local.pdf").build()));
        assertThatThrownBy(() -> service.loadForDownload(1L)).isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(storage);
    }
    @Test void approvedPostMediaCanBeDownloaded() {
        ForumAttachment attachment = ForumAttachment.builder().post(ForumPost.builder()
                .moderationStatus(ModerationStatus.APPROVED).build()).storedFilename("local.pdf").build();
        when(repository.findById(1L)).thenReturn(Optional.of(attachment));
        assertThat(service.loadForDownload(1L).metadata()).isSameAs(attachment);
        verify(storage).load("local.pdf");
    }
}

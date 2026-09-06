package com.studywebsite.service.media;

import com.studywebsite.model.ForumAttachmentType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ForumAttachmentStorageServiceTest {

    Path temporaryDirectory;

    @BeforeEach
    void createTestDirectory() throws IOException {
        temporaryDirectory = Path.of("build", "test-media-storage", UUID.randomUUID().toString());
        Files.createDirectories(temporaryDirectory);
    }

    @AfterEach
    void removeTestDirectory() throws IOException {
        if (!Files.exists(temporaryDirectory)) {
            return;
        }
        try (var paths = Files.walk(temporaryDirectory)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    @Test
    void storesAndLoadsAValidPdfUsingAnOpaqueFilename() throws Exception {
        ForumAttachmentStorageService service = new ForumAttachmentStorageService(temporaryDirectory.toString());
        service.initializeStorage();
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "study plan.pdf",
                "application/pdf",
                "%PDF-1.4\nexample".getBytes()
        );

        ForumAttachmentStorageService.StoredFile stored = service.store(file);

        assertThat(stored.originalFilename()).isEqualTo("study plan.pdf");
        assertThat(stored.type()).isEqualTo(ForumAttachmentType.PDF);
        assertThat(stored.storedFilename()).endsWith(".pdf").doesNotContain("study plan");
        assertThat(service.load(stored.storedFilename()).exists()).isTrue();
    }

    @Test
    void rejectsFilesOutsideTheSupportedMediaTypes() {
        ForumAttachmentStorageService service = new ForumAttachmentStorageService(temporaryDirectory.toString());
        service.initializeStorage();
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "script.exe",
                "application/octet-stream",
                new byte[]{1, 2, 3}
        );

        assertThatThrownBy(() -> service.store(file))
                .isInstanceOf(InvalidForumAttachmentException.class)
                .hasMessageContaining("Only PDF, audio, and video");
    }

    @Test
    void rejectsAFileThatOnlyPretendsToBeAPdf() {
        ForumAttachmentStorageService service = new ForumAttachmentStorageService(temporaryDirectory.toString());
        service.initializeStorage();
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "fake.pdf",
                "application/pdf",
                "not a real PDF".getBytes()
        );

        assertThatThrownBy(() -> service.store(file))
                .isInstanceOf(InvalidForumAttachmentException.class)
                .hasMessageContaining("valid PDF data");
    }

    @Test
    void rejectsAFileWhoseMimeTypeDoesNotMatchItsExtension() {
        ForumAttachmentStorageService service = new ForumAttachmentStorageService(temporaryDirectory.toString());
        service.initializeStorage();
        MockMultipartFile file = new MockMultipartFile(
                "files",
                "recording.mp3",
                "image/png",
                new byte[]{1, 2, 3}
        );

        assertThatThrownBy(() -> service.store(file))
                .isInstanceOf(InvalidForumAttachmentException.class)
                .hasMessageContaining("does not match");
    }
}

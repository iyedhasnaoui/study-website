package com.studywebsite.service;

import com.studywebsite.model.ResourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.Path;
import java.nio.file.Files;
import static org.assertj.core.api.Assertions.*;

class LearningMaterialStorageServiceTest {
    @TempDir Path directory;
    private final LearningMaterialStorageService service = new LearningMaterialStorageService();
    @BeforeEach void configureStorage() {
        ReflectionTestUtils.setField(service, "uploadDirectory", directory.toString());
    }
    @Test void validPdfRoundTripsWithOpaqueStorageName() throws Exception {
        byte[] bytes = "%PDF-1.4\nlocal test".getBytes();
        var result = service.store(new MockMultipartFile("file", "../../notes.pdf", "application/pdf", bytes), ResourceType.PDF);
        assertThat(result.originalFilename()).isEqualTo("notes.pdf");
        assertThat(Path.of(result.path()).getParent()).isEqualTo(directory);
        assertThat(Path.of(result.path()).getFileName().toString()).isNotEqualTo("notes.pdf");
        assertThat(service.load(result.path()).getContentAsByteArray()).isEqualTo(bytes);
    }
    @Test void windowsClientFilenameIsReducedToBasenameOnEveryHost() {
        var result = service.store(new MockMultipartFile("file", "C:\\fakepath\\notes.pdf", "application/pdf", "%PDF-1.4 test".getBytes()), ResourceType.PDF);
        assertThat(result.originalFilename()).isEqualTo("notes.pdf");
    }
    @Test void rejectsFakePdfBeforeWriting() throws Exception {
        assertThatThrownBy(() -> service.store(new MockMultipartFile("file", "fake.pdf", "application/pdf", "not pdf".getBytes()), ResourceType.PDF))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("valid PDF");
        try (var files = Files.list(directory)) { assertThat(files.count()).isZero(); }
    }
    @Test void rejectsEmptyUnsupportedAndMismatchedFiles() {
        assertThatThrownBy(() -> service.store(new MockMultipartFile("file", new byte[0]), ResourceType.PDF)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.store(new MockMultipartFile("file", "x.html", "text/html", new byte[]{1}), ResourceType.PDF)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.store(new MockMultipartFile("file", "x.mp3", "audio/mpeg", new byte[]{1}), ResourceType.PDF)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void rejectsOversizedMaterialBeforeWriting() {
        var oversized = new MockMultipartFile("file", "x.mp3", "audio/mpeg", new byte[]{1}) {
            @Override public long getSize() { return 50L * 1024L * 1024L + 1; }
        };
        assertThatThrownBy(() -> service.store(oversized, ResourceType.AUDIO)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("50 MB");
    }
    @Test void rejectsReadingOutsideStorageRootAndMissingFiles() {
        assertThatThrownBy(() -> service.load(directory.resolve("../outside.pdf").toString())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.load(directory.resolve("missing.pdf").toString())).isInstanceOf(IllegalArgumentException.class);
    }
}

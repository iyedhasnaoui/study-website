package com.studywebsite.service.media;

import com.studywebsite.model.ForumAttachmentType;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ForumAttachmentStorageService {

    public static final long MAX_FILE_SIZE_BYTES = 50L * 1024L * 1024L;

    private static final Map<ForumAttachmentType, Set<String>> ALLOWED_EXTENSIONS = Map.of(
            ForumAttachmentType.PDF, Set.of("pdf"),
            ForumAttachmentType.AUDIO, Set.of("mp3", "wav", "m4a", "aac", "ogg", "oga", "webm"),
            ForumAttachmentType.VIDEO, Set.of("mp4", "webm", "mov", "m4v")
    );

    private final Path storageRoot;

    public ForumAttachmentStorageService(@Value("${app.upload.forum-directory:uploads/forum}") String storageDirectory) {
        this.storageRoot = Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    @PostConstruct
    void initializeStorage() {
        try {
            Files.createDirectories(storageRoot);
        } catch (IOException exception) {
            throw new ForumAttachmentStorageException("Unable to initialize forum media storage", exception);
        }
    }

    public StoredFile store(MultipartFile file) {
        validateFile(file);

        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        String extension = extensionOf(originalFilename);
        ForumAttachmentType attachmentType = resolveType(file.getContentType(), extension);
        String mimeType = normalizedMimeType(file.getContentType(), attachmentType, extension);
        String storedFilename = UUID.randomUUID() + "." + extension;
        Path destination = storageRoot.resolve(storedFilename).normalize();

        if (!destination.startsWith(storageRoot)) {
            throw new InvalidForumAttachmentException("Invalid attachment filename");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new ForumAttachmentStorageException("The attachment could not be stored", exception);
        }

        return new StoredFile(
                originalFilename,
                storedFilename,
                mimeType,
                attachmentType,
                file.getSize()
        );
    }

    public Resource load(String storedFilename) {
        Path filePath = storageRoot.resolve(storedFilename).normalize();
        if (!filePath.startsWith(storageRoot) || !Files.isRegularFile(filePath)) {
            throw new InvalidForumAttachmentException("Attachment file not found");
        }

        try {
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException exception) {
            throw new ForumAttachmentStorageException("The attachment could not be opened", exception);
        }
    }

    public void delete(String storedFilename) {
        Path filePath = storageRoot.resolve(storedFilename).normalize();
        if (!filePath.startsWith(storageRoot)) return;

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException exception) {
            throw new ForumAttachmentStorageException("The attachment could not be deleted", exception);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidForumAttachmentException("Empty files cannot be uploaded");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidForumAttachmentException("Each attachment must be 50 MB or smaller");
        }

        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        String extension = extensionOf(originalFilename);
        ForumAttachmentType type = resolveType(file.getContentType(), extension);
        validateContentType(file.getContentType(), type);
        if (!ALLOWED_EXTENSIONS.get(type).contains(extension)) {
            throw new InvalidForumAttachmentException("Unsupported file extension: ." + extension);
        }

        if (type == ForumAttachmentType.PDF && !hasPdfSignature(file)) {
            throw new InvalidForumAttachmentException("The selected PDF does not contain valid PDF data");
        }
    }

    private ForumAttachmentType resolveType(String contentType, String extension) {
        String normalizedContentType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (normalizedContentType.equals("application/pdf")) return ForumAttachmentType.PDF;
        if (normalizedContentType.startsWith("audio/")) return ForumAttachmentType.AUDIO;
        if (normalizedContentType.startsWith("video/")) return ForumAttachmentType.VIDEO;
        if (extension.equals("pdf")) return ForumAttachmentType.PDF;
        if (Set.of("mp3", "wav", "m4a", "aac", "ogg", "oga").contains(extension)) {
            return ForumAttachmentType.AUDIO;
        }
        if (Set.of("mp4", "mov", "m4v").contains(extension)) return ForumAttachmentType.VIDEO;

        throw new InvalidForumAttachmentException("Only PDF, audio, and video files are supported");
    }

    private void validateContentType(String contentType, ForumAttachmentType type) {
        if (contentType == null || contentType.isBlank() || contentType.equalsIgnoreCase("application/octet-stream")) {
            return;
        }

        String normalizedContentType = contentType.toLowerCase(Locale.ROOT);
        boolean matches = switch (type) {
            case PDF -> normalizedContentType.equals("application/pdf");
            case AUDIO -> normalizedContentType.startsWith("audio/");
            case VIDEO -> normalizedContentType.startsWith("video/");
        };
        if (!matches) {
            throw new InvalidForumAttachmentException("The file type does not match its filename extension");
        }
    }

    private String normalizedMimeType(String contentType, ForumAttachmentType type, String extension) {
        if (contentType != null && !contentType.isBlank() && !contentType.equals("application/octet-stream")) {
            return contentType.toLowerCase(Locale.ROOT);
        }
        return switch (type) {
            case PDF -> "application/pdf";
            case AUDIO -> extension.equals("webm") ? "audio/webm" : "audio/" + extension;
            case VIDEO -> extension.equals("mov") ? "video/quicktime" : "video/" + extension;
        };
    }

    private boolean hasPdfSignature(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            byte[] signature = inputStream.readNBytes(5);
            return signature.length == 5
                    && signature[0] == '%'
                    && signature[1] == 'P'
                    && signature[2] == 'D'
                    && signature[3] == 'F'
                    && signature[4] == '-';
        } catch (IOException exception) {
            throw new ForumAttachmentStorageException("The selected PDF could not be inspected", exception);
        }
    }

    private String sanitizeFilename(String originalFilename) {
        String candidate = originalFilename == null || originalFilename.isBlank()
                ? "attachment"
                : originalFilename.replace('\\', '/');
        candidate = candidate.substring(candidate.lastIndexOf('/') + 1)
                .replaceAll("[\\p{Cntrl}]", "_")
                .strip();
        if (candidate.length() > 180) {
            candidate = candidate.substring(candidate.length() - 180);
        }
        return candidate;
    }

    private String extensionOf(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 1 || dotIndex == filename.length() - 1) {
            throw new InvalidForumAttachmentException("The attachment must have a supported file extension");
        }
        return filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    public record StoredFile(
            String originalFilename,
            String storedFilename,
            String mimeType,
            ForumAttachmentType type,
            long sizeBytes
    ) {
    }
}

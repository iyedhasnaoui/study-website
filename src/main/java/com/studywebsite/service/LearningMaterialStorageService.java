package com.studywebsite.service;

import com.studywebsite.model.ResourceType;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LearningMaterialStorageService {
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "application/pdf",
            "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg",
            "video/mp4", "video/webm", "video/quicktime", "video/ogg"
    );

    @Value("${app.upload.material-directory:uploads/materials}")
    private String uploadDirectory;

    public StoredMaterial store(MultipartFile file, ResourceType requestedType) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Choose a material file to upload");
        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only PDF, audio, and video learning materials are supported");
        }
        ResourceType detected = detectType(contentType);
        if (requestedType != detected) {
            throw new IllegalArgumentException("The selected material type does not match the uploaded file");
        }

        try {
            Path root = Path.of(uploadDirectory).toAbsolutePath().normalize();
            Files.createDirectories(root);
            String originalName = file.getOriginalFilename() == null ? "material" : Path.of(file.getOriginalFilename()).getFileName().toString();
            String extension = extension(originalName);
            Path target = root.resolve(UUID.randomUUID() + extension).normalize();
            if (!target.startsWith(root)) throw new IllegalArgumentException("Invalid material filename");
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredMaterial(target.toString(), originalName, contentType, file.getSize());
        } catch (IOException exception) {
            throw new IllegalStateException("The material could not be stored", exception);
        }
    }

    public FileSystemResource load(String storedPath) {
        Path root = Path.of(uploadDirectory).toAbsolutePath().normalize();
        Path path = Path.of(storedPath).toAbsolutePath().normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new IllegalArgumentException("Material file not found");
        }
        return new FileSystemResource(path);
    }

    private ResourceType detectType(String contentType) {
        if (contentType.equals("application/pdf")) return ResourceType.PDF;
        if (contentType.startsWith("audio/")) return ResourceType.AUDIO;
        return ResourceType.VIDEO;
    }

    private String extension(String filename) {
        int index = filename.lastIndexOf('.');
        if (index < 0) return "";
        String extension = filename.substring(index).toLowerCase(Locale.ROOT);
        return extension.matches("\\.[a-z0-9]{1,8}") ? extension : "";
    }

    public record StoredMaterial(String path, String originalFilename, String contentType, long sizeBytes) {
    }
}

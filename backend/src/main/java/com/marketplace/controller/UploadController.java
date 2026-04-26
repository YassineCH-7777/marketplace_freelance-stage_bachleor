package com.marketplace.controller;

import com.marketplace.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UploadController {

    private static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            MediaType.IMAGE_GIF_VALUE,
            "image/webp"
    );

    @Value("${marketplace.upload-dir:uploads}")
    private String uploadDir;

    @PostMapping("/freelancer/uploads/image")
    public ResponseEntity<ImageUploadResponse> uploadServiceImage(
            @AuthenticationPrincipal User user,
            @RequestParam("image") MultipartFile image) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur non connecte");
        }

        validateImage(image);

        try {
            Path targetDirectory = getServiceUploadDirectory();
            Files.createDirectories(targetDirectory);

            String originalFilename = StringUtils.cleanPath(String.valueOf(image.getOriginalFilename()));
            String extension = resolveExtension(originalFilename, image.getContentType());
            String storedFilename = user.getId() + "-" + UUID.randomUUID() + extension;
            Path targetFile = targetDirectory.resolve(storedFilename).normalize();

            if (!targetFile.startsWith(targetDirectory)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom de fichier invalide");
            }

            try (InputStream inputStream = image.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }

            String imageUrl = ServletUriComponentsBuilder
                    .fromCurrentContextPath()
                    .path("/api/public/uploads/services/")
                    .path(storedFilename)
                    .toUriString();

            return ResponseEntity.ok(new ImageUploadResponse(
                    imageUrl,
                    originalFilename,
                    image.getContentType(),
                    image.getSize()
            ));
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer l'image", exception);
        }
    }

    @GetMapping("/public/uploads/services/{filename:.+}")
    public ResponseEntity<Resource> getServiceImage(@PathVariable String filename) {
        try {
            Path targetDirectory = getServiceUploadDirectory();
            Path file = targetDirectory.resolve(StringUtils.cleanPath(filename)).normalize();

            if (!file.startsWith(targetDirectory) || !Files.exists(file) || !Files.isReadable(file)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image introuvable");
            }

            Resource resource = new UrlResource(file.toUri());
            String contentType = Files.probeContentType(file);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType != null ? contentType : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de lire l'image", exception);
        }
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucune image fournie");
        }

        if (image.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image trop volumineuse");
        }

        String contentType = image.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format image non supporte");
        }
    }

    private Path getServiceUploadDirectory() {
        return Paths.get(uploadDir, "services").toAbsolutePath().normalize();
    }

    private String resolveExtension(String originalFilename, String contentType) {
        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (extension != null && !extension.isBlank()) {
            return "." + extension.toLowerCase(Locale.ROOT);
        }

        if (MediaType.IMAGE_PNG_VALUE.equals(contentType)) {
            return ".png";
        }

        if (MediaType.IMAGE_GIF_VALUE.equals(contentType)) {
            return ".gif";
        }

        if ("image/webp".equals(contentType)) {
            return ".webp";
        }

        return ".jpg";
    }

    public record ImageUploadResponse(String url, String fileName, String contentType, long size) {
    }
}

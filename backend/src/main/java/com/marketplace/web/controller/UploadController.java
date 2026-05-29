package com.marketplace.web.controller;

import com.marketplace.domain.model.Attachment;
import com.marketplace.domain.model.Conversation;
import com.marketplace.domain.model.User;
import com.marketplace.infrastructure.persistence.AttachmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ContentDisposition;
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
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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

    private final AttachmentRepository attachmentRepository;

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
            String contentType = image.getContentType().toLowerCase(Locale.ROOT);
            String extension = resolveExtension(contentType);
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
                    contentType,
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
                    .header("X-Content-Type-Options", "nosniff")
                    .body(resource);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de lire l'image", exception);
        }
    }

    @GetMapping("/uploads/attachments/{filename:.+}")
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> getAttachment(
            @AuthenticationPrincipal User user,
            @PathVariable String filename) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur non connecte");
        }

        String storedFilename = StringUtils.cleanPath(filename);
        if (storedFilename.isBlank() || storedFilename.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom de fichier invalide");
        }

        Attachment attachment = attachmentRepository.findByStoredFileName(storedFilename)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable"));

        if (!canAccessAttachment(attachment, user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }

        try {
            Path targetDirectory = getAttachmentUploadDirectory();
            Path file = targetDirectory.resolve(storedFilename).normalize();

            if (!file.startsWith(targetDirectory) || !Files.exists(file) || !Files.isReadable(file)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fichier introuvable");
            }

            Resource resource = new UrlResource(file.toUri());
            String contentType = attachment.getContentType() != null
                    ? attachment.getContentType()
                    : MediaType.APPLICATION_OCTET_STREAM_VALUE;
            String filenameHeader = ContentDisposition.attachment()
                    .filename(attachment.getOriginalFileName(), StandardCharsets.UTF_8)
                    .build()
                    .toString();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(Files.size(file))
                    .header(HttpHeaders.CONTENT_DISPOSITION, filenameHeader)
                    .header("X-Content-Type-Options", "nosniff")
                    .body(resource);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible de lire le fichier", exception);
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
        String normalizedContentType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(normalizedContentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format image non supporte");
        }
        validateImageSignature(image, normalizedContentType);
    }

    private Path getServiceUploadDirectory() {
        return Paths.get(uploadDir, "services").toAbsolutePath().normalize();
    }

    private Path getAttachmentUploadDirectory() {
        return Paths.get(uploadDir, "attachments").toAbsolutePath().normalize();
    }

    private String resolveExtension(String contentType) {
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

    private void validateImageSignature(MultipartFile image, String contentType) {
        try (InputStream inputStream = image.getInputStream()) {
            byte[] header = inputStream.readNBytes(16);
            boolean valid = switch (contentType) {
                case MediaType.IMAGE_JPEG_VALUE -> startsWith(header, 0xFF, 0xD8, 0xFF);
                case MediaType.IMAGE_PNG_VALUE -> startsWith(header, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
                case MediaType.IMAGE_GIF_VALUE -> startsWithAscii(header, "GIF87a") || startsWithAscii(header, "GIF89a");
                case "image/webp" -> startsWithAscii(header, "RIFF") && startsWithAsciiAt(header, "WEBP", 8);
                default -> false;
            };
            if (!valid) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le contenu de l'image ne correspond pas a son format");
            }
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impossible de lire l'image", exception);
        }
    }

    private boolean canAccessAttachment(Attachment attachment, Long userId) {
        if (attachment.getUploader() != null && attachment.getUploader().getId().equals(userId)) {
            return true;
        }
        if (attachment.getMessage() != null) {
            return isConversationParticipant(attachment.getMessage().getConversation(), userId);
        }
        if (attachment.getOrder() != null) {
            return attachment.getOrder().getClient().getId().equals(userId)
                    || attachment.getOrder().getFreelancer().getUser().getId().equals(userId);
        }
        return attachment.getServiceRequest() != null;
    }

    private boolean isConversationParticipant(Conversation conversation, Long userId) {
        return conversation.getClient().getId().equals(userId)
                || conversation.getFreelancer().getUser().getId().equals(userId);
    }

    private boolean startsWith(byte[] value, int... prefix) {
        if (value.length < prefix.length) {
            return false;
        }
        for (int index = 0; index < prefix.length; index++) {
            if ((value[index] & 0xFF) != prefix[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean startsWithAscii(byte[] value, String prefix) {
        return startsWithAsciiAt(value, prefix, 0);
    }

    private boolean startsWithAsciiAt(byte[] value, String prefix, int offset) {
        byte[] prefixBytes = prefix.getBytes(StandardCharsets.US_ASCII);
        if (value.length < offset + prefixBytes.length) {
            return false;
        }
        for (int index = 0; index < prefixBytes.length; index++) {
            if (value[offset + index] != prefixBytes[index]) {
                return false;
            }
        }
        return true;
    }

    public record ImageUploadResponse(String url, String fileName, String contentType, long size) {
    }
}

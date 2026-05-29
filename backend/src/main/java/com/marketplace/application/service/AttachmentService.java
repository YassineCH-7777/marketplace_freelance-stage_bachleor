package com.marketplace.application.service;

import com.marketplace.domain.model.Attachment;
import com.marketplace.domain.model.Conversation;
import com.marketplace.domain.model.Message;
import com.marketplace.domain.model.Order;
import com.marketplace.domain.model.ServiceRequest;
import com.marketplace.domain.model.User;
import com.marketplace.infrastructure.persistence.AttachmentRepository;
import com.marketplace.infrastructure.persistence.MessageRepository;
import com.marketplace.infrastructure.persistence.OrderRepository;
import com.marketplace.infrastructure.persistence.ServiceRequestRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
import com.marketplace.web.dto.attachment.AttachmentDto;
import com.marketplace.web.exception.BusinessException;
import com.marketplace.web.exception.ResourceNotFoundException;
import com.marketplace.web.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    private static final int MAX_FILES_PER_UPLOAD = 5;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            MediaType.IMAGE_GIF_VALUE,
            "image/webp",
            MediaType.APPLICATION_PDF_VALUE,
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"
    );
    private static final Map<String, String> EXTENSION_BY_CONTENT_TYPE = Map.of(
            MediaType.IMAGE_JPEG_VALUE, ".jpg",
            MediaType.IMAGE_PNG_VALUE, ".png",
            MediaType.IMAGE_GIF_VALUE, ".gif",
            "image/webp", ".webp",
            MediaType.APPLICATION_PDF_VALUE, ".pdf",
            "application/msword", ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"
    );
    private static final Set<String> ALLOWED_ATTACHMENT_TYPES = Set.of(
            "IMAGE", "PDF", "BRIEF", "INVOICE", "DELIVERY_PROOF", "REVISION_FILE", "DOCUMENT", "OTHER"
    );

    private final AttachmentRepository attachmentRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final OrderRepository orderRepository;

    @Value("${marketplace.upload-dir:uploads}")
    private String uploadDir;

    @Transactional
    public List<AttachmentDto> uploadMessageAttachments(Long messageId, Long userId, List<MultipartFile> files, String type) {
        User uploader = findUser(userId);
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable"));

        if (!message.getSender().getId().equals(userId)) {
            throw new UnauthorizedException("Seul l'expediteur peut ajouter des pieces jointes a ce message.");
        }

        return storeFiles(uploader, message, null, null, files, type);
    }

    @Transactional
    public List<AttachmentDto> uploadServiceRequestAttachments(
            Long serviceRequestId,
            Long userId,
            List<MultipartFile> files,
            String type
    ) {
        User uploader = findUser(userId);
        ServiceRequest serviceRequest = serviceRequestRepository.findById(serviceRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));

        if (!serviceRequest.getClient().getId().equals(userId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        return storeFiles(uploader, null, serviceRequest, null, files, type);
    }

    @Transactional
    public List<AttachmentDto> uploadOrderAttachments(Long orderId, Long userId, List<MultipartFile> files, String type) {
        User uploader = findUser(userId);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));

        if (!isOrderParticipant(order, userId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        return storeFiles(uploader, null, null, order, files, type);
    }

    private List<AttachmentDto> storeFiles(
            User uploader,
            Message message,
            ServiceRequest serviceRequest,
            Order order,
            List<MultipartFile> files,
            String type
    ) {
        validateFiles(files);

        try {
            Path targetDirectory = getAttachmentUploadDirectory();
            Files.createDirectories(targetDirectory);

            return files.stream()
                    .map(file -> storeFile(uploader, message, serviceRequest, order, file, type, targetDirectory))
                    .map(AttachmentDto::from)
                    .toList();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer le fichier", exception);
        }
    }

    private Attachment storeFile(
            User uploader,
            Message message,
            ServiceRequest serviceRequest,
            Order order,
            MultipartFile file,
            String type,
            Path targetDirectory
    ) {
        validateFile(file);

        try {
            String originalFilename = resolveOriginalFilename(file);
            String contentType = file.getContentType().toLowerCase(Locale.ROOT);
            String extension = resolveExtension(originalFilename, contentType);
            String storedFilename = uploader.getId() + "-" + UUID.randomUUID() + extension;
            Path targetFile = targetDirectory.resolve(storedFilename).normalize();

            if (!targetFile.startsWith(targetDirectory)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom de fichier invalide");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }

            String fileUrl = "/uploads/attachments/" + storedFilename;

            Attachment attachment = Attachment.builder()
                    .uploader(uploader)
                    .message(message)
                    .serviceRequest(serviceRequest)
                    .order(order)
                    .attachmentType(resolveAttachmentType(type, contentType))
                    .originalFileName(originalFilename)
                    .storedFileName(storedFilename)
                    .contentType(contentType)
                    .fileSize(file.getSize())
                    .fileUrl(fileUrl)
                    .build();

            return attachmentRepository.save(attachment);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Impossible d'enregistrer le fichier", exception);
        }
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
    }

    private void validateFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new BusinessException("Aucun fichier fourni.", HttpStatus.BAD_REQUEST);
        }
        if (files.size() > MAX_FILES_PER_UPLOAD) {
            throw new BusinessException("Vous pouvez envoyer 5 fichiers maximum a la fois.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Aucun fichier fourni.", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException("Fichier trop volumineux. Taille maximale : 10 Mo.", HttpStatus.BAD_REQUEST);
        }

        String contentType = file.getContentType();
        String normalizedContentType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(normalizedContentType)) {
            throw new BusinessException("Format de fichier non supporte.", HttpStatus.BAD_REQUEST);
        }
        validateFileSignature(file, normalizedContentType);
    }

    private String resolveOriginalFilename(MultipartFile file) {
        String originalFilename = StringUtils.cleanPath(String.valueOf(file.getOriginalFilename()));
        if (originalFilename.isBlank() || originalFilename.contains("..")) {
            throw new BusinessException("Nom de fichier invalide.", HttpStatus.BAD_REQUEST);
        }
        return originalFilename;
    }

    private String resolveExtension(String originalFilename, String contentType) {
        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (extension != null) {
            String normalizedExtension = extension.toLowerCase(Locale.ROOT);
            if (ALLOWED_EXTENSIONS.contains(normalizedExtension)) {
                return "." + normalizedExtension;
            }
        }
        return EXTENSION_BY_CONTENT_TYPE.getOrDefault(contentType, ".bin");
    }

    private String resolveAttachmentType(String type, String contentType) {
        String normalizedType = type == null ? "" : type.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        if (ALLOWED_ATTACHMENT_TYPES.contains(normalizedType)) {
            return normalizedType;
        }
        if (contentType.startsWith("image/")) {
            return "IMAGE";
        }
        if (MediaType.APPLICATION_PDF_VALUE.equals(contentType)) {
            return "PDF";
        }
        return "DOCUMENT";
    }

    private void validateFileSignature(MultipartFile file, String contentType) {
        try (InputStream inputStream = file.getInputStream()) {
            byte[] header = inputStream.readNBytes(16);
            if (!hasAllowedSignature(contentType, header)) {
                throw new BusinessException("Le contenu du fichier ne correspond pas a son format.", HttpStatus.BAD_REQUEST);
            }
        } catch (IOException exception) {
            throw new BusinessException("Impossible de lire le fichier.", HttpStatus.BAD_REQUEST);
        }
    }

    private boolean hasAllowedSignature(String contentType, byte[] header) {
        return switch (contentType) {
            case MediaType.IMAGE_JPEG_VALUE -> startsWith(header, 0xFF, 0xD8, 0xFF);
            case MediaType.IMAGE_PNG_VALUE -> startsWith(header, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case MediaType.IMAGE_GIF_VALUE -> startsWithAscii(header, "GIF87a") || startsWithAscii(header, "GIF89a");
            case "image/webp" -> startsWithAscii(header, "RIFF") && startsWithAsciiAt(header, "WEBP", 8);
            case MediaType.APPLICATION_PDF_VALUE -> startsWithAscii(header, "%PDF-");
            case "application/msword" -> startsWith(header, 0xD0, 0xCF, 0x11, 0xE0);
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> startsWithAscii(header, "PK");
            default -> false;
        };
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

    private boolean isOrderParticipant(Order order, Long userId) {
        return order.getClient().getId().equals(userId)
                || order.getFreelancer().getUser().getId().equals(userId);
    }

    private Path getAttachmentUploadDirectory() {
        return Paths.get(uploadDir, "attachments").toAbsolutePath().normalize();
    }
}

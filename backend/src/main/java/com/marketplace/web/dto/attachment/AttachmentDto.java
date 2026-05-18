package com.marketplace.web.dto.attachment;

import com.marketplace.domain.model.Attachment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AttachmentDto {
    private Long id;
    private Long uploaderId;
    private String uploaderEmail;
    private Long messageId;
    private Long serviceRequestId;
    private Long orderId;
    private String attachmentType;
    private String originalFileName;
    private String contentType;
    private Long fileSize;
    private String fileUrl;
    private LocalDateTime createdAt;

    public static AttachmentDto from(Attachment attachment) {
        return AttachmentDto.builder()
                .id(attachment.getId())
                .uploaderId(attachment.getUploader() != null ? attachment.getUploader().getId() : null)
                .uploaderEmail(attachment.getUploader() != null ? attachment.getUploader().getEmail() : null)
                .messageId(attachment.getMessage() != null ? attachment.getMessage().getId() : null)
                .serviceRequestId(attachment.getServiceRequest() != null ? attachment.getServiceRequest().getId() : null)
                .orderId(attachment.getOrder() != null ? attachment.getOrder().getId() : null)
                .attachmentType(attachment.getAttachmentType())
                .originalFileName(attachment.getOriginalFileName())
                .contentType(attachment.getContentType())
                .fileSize(attachment.getFileSize())
                .fileUrl(attachment.getFileUrl())
                .createdAt(attachment.getCreatedAt())
                .build();
    }
}

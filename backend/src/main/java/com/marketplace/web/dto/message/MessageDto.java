package com.marketplace.web.dto.message;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketplace.web.dto.attachment.AttachmentDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MessageDto {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderEmail;
    private String content;

    @JsonProperty("isRead")
    private boolean isRead;

    @JsonProperty("isImportant")
    private boolean isImportant;

    private List<AttachmentDto> attachments;
    private LocalDateTime createdAt;
}

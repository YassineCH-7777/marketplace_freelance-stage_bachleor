package com.marketplace.dto.notification;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.marketplace.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificationDto {
    private Long id;
    private String content;
    private NotificationType type;
    private String relatedEntityType;
    private Long relatedEntityId;

    @JsonProperty("isRead")
    private boolean isRead;

    private LocalDateTime createdAt;
}

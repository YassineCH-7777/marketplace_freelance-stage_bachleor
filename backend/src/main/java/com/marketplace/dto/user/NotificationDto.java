package com.marketplace.dto.user; // Actually in dto/user but represents notification

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
    private boolean isRead;
    private LocalDateTime createdAt;
}

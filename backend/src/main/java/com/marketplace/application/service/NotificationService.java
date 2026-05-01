package com.marketplace.application.service;

import com.marketplace.web.dto.notification.NotificationDto;
import com.marketplace.domain.model.Notification;
import com.marketplace.domain.model.User;
import com.marketplace.domain.enums.NotificationType;
import com.marketplace.infrastructure.persistence.NotificationRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void createNotification(Long userId, NotificationType type, String content) {
        createNotification(userId, type, content, null, null);
    }

    @Transactional
    public void createNotification(
            Long userId,
            NotificationType type,
            String content,
            String relatedEntityType,
            Long relatedEntityId) {
        User user = userRepository.findById(userId).orElseThrow();
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(type.name())
                .body(content)
                .relatedEntityType(relatedEntityType)
                .relatedEntityId(relatedEntityId)
                .build();
        notificationRepository.save(notification);
    }

    public List<NotificationDto> getAllNotifications(Long userId) {
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private NotificationDto mapToDto(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .content(notification.getBody() != null ? notification.getBody() : notification.getTitle())
                .relatedEntityType(notification.getRelatedEntityType())
                .relatedEntityId(notification.getRelatedEntityId())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}

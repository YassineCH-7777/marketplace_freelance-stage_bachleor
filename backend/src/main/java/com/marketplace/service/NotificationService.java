package com.marketplace.service;

import com.marketplace.dto.notification.NotificationDto;
import com.marketplace.model.Notification;
import com.marketplace.model.User;
import com.marketplace.enums.NotificationType;
import com.marketplace.persistence.ConversationRepository;
import com.marketplace.persistence.NotificationRepository;
import com.marketplace.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final String CONVERSATION_ENTITY_TYPE = "CONVERSATION";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;

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

    @Transactional
    public void deleteNotificationsForRelatedEntity(String relatedEntityType, Long relatedEntityId) {
        if (relatedEntityType == null || relatedEntityId == null) {
            return;
        }

        notificationRepository.deleteByRelatedEntityTypeAndRelatedEntityId(relatedEntityType, relatedEntityId);
    }

    @Transactional
    public List<NotificationDto> getAllNotifications(Long userId) {
        List<Notification> visibleNotifications = new ArrayList<>();
        for (Notification notification : notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId)) {
            if (isDeletedConversationNotification(notification)) {
                notificationRepository.delete(notification);
            } else {
                visibleNotifications.add(notification);
            }
        }

        return visibleNotifications
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private boolean isDeletedConversationNotification(Notification notification) {
        return CONVERSATION_ENTITY_TYPE.equals(notification.getRelatedEntityType())
                && notification.getRelatedEntityId() != null
                && !conversationRepository.existsById(notification.getRelatedEntityId());
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

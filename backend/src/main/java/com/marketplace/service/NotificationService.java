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

    /**
     * Cree une notification simple sans lien vers une entite metier precise.
     */
    @Transactional
    public void createNotification(Long userId, NotificationType type, String content) {
        createNotification(userId, type, content, null, null);
    }

    /**
     * Cree une notification rattachee a une entite metier consultable par le frontend.
     */
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

    /**
     * Supprime les notifications liees a une entite disparue, par exemple une conversation.
     */
    @Transactional
    public void deleteNotificationsForRelatedEntity(String relatedEntityType, Long relatedEntityId) {
        if (relatedEntityType == null || relatedEntityId == null) {
            return;
        }

        notificationRepository.deleteByRelatedEntityTypeAndRelatedEntityId(relatedEntityType, relatedEntityId);
    }

    /**
     * Marque toutes les notifications de l'utilisateur comme lues.
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsRead(userId);
    }

    /**
     * Marque une notification comme lue si elle appartient a l'utilisateur connecte.
     */
    @Transactional
    public int markAsRead(Long userId, Long notificationId) {
        return notificationRepository.markAsRead(notificationId, userId);
    }

    /**
     * Retourne les notifications visibles et nettoie celles qui pointent vers des conversations supprimees.
     */
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
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}

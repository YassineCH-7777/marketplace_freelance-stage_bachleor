package com.marketplace.application.service;

import com.marketplace.enums.NotificationType;
import com.marketplace.model.Notification;
import com.marketplace.model.User;
import com.marketplace.persistence.ConversationRepository;
import com.marketplace.persistence.NotificationRepository;
import com.marketplace.persistence.UserRepository;
import com.marketplace.service.NotificationService;
import com.marketplace.dto.notification.NotificationDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void deleteNotificationsForRelatedEntityRemovesMatchingNotifications() {
        notificationService.deleteNotificationsForRelatedEntity("CONVERSATION", 44L);

        verify(notificationRepository).deleteByRelatedEntityTypeAndRelatedEntityId("CONVERSATION", 44L);
    }

    @Test
    void getAllNotificationsRemovesConversationNotificationsWhenConversationWasDeleted() {
        User user = User.builder().id(5L).email("client@marketplace.com").build();
        Notification staleMessage = notification(
                1L,
                user,
                "Nouveau message de freelancer@marketplace.com : salut",
                "CONVERSATION",
                44L);
        Notification keptNotification = notification(
                2L,
                user,
                "Nouvelle proposition",
                "ORDER",
                88L);

        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(5L))
                .thenReturn(List.of(staleMessage, keptNotification));
        when(conversationRepository.existsById(44L)).thenReturn(false);

        List<NotificationDto> result = notificationService.getAllNotifications(5L);

        assertThat(result).extracting(NotificationDto::getId).containsExactly(2L);
        verify(notificationRepository).delete(staleMessage);
    }

    private Notification notification(
            Long id,
            User user,
            String body,
            String relatedEntityType,
            Long relatedEntityId) {
        return Notification.builder()
                .id(id)
                .user(user)
                .title(NotificationType.NEW_MESSAGE.name())
                .body(body)
                .type(NotificationType.NEW_MESSAGE)
                .relatedEntityType(relatedEntityType)
                .relatedEntityId(relatedEntityId)
                .createdAt(LocalDateTime.now())
                .build();
    }
}

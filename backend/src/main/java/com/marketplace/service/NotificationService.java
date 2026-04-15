package com.marketplace.service;

import com.marketplace.dto.user.NotificationDto;
import com.marketplace.entity.Notification;
import com.marketplace.entity.User;
import com.marketplace.enums.NotificationType;
import com.marketplace.repository.NotificationRepository;
import com.marketplace.repository.UserRepository;
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
        User user = userRepository.findById(userId).orElseThrow();
        Notification notif = Notification.builder()
                .user(user)
                .type(type)
                .content(content)
                .isRead(false)
                .build();
        notificationRepository.save(notif);
    }

    public List<NotificationDto> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }
    
    public List<NotificationDto> getAllNotifications(Long userId) {
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId).orElseThrow();
        if (notification.getUser().getId().equals(userId)) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    private NotificationDto mapToDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType())
                .content(n.getContent())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}

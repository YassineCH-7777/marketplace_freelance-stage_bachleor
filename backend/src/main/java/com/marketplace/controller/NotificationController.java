package com.marketplace.controller;

import com.marketplace.dto.notification.NotificationDto;
import com.marketplace.model.User;
import com.marketplace.service.NotificationService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Retourne les notifications de l'utilisateur connecte, triees par date recente.
     */
    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getAllNotifications(user.getId()));
    }

    /**
     * Marque toutes les notifications de l'utilisateur connecte comme lues.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, Integer>> markAllAsRead(@AuthenticationPrincipal User user) {
        int updated = notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    /**
     * Marque une notification precise comme lue si elle appartient a l'utilisateur connecte.
     */
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Integer>> markAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable Long notificationId) {
        int updated = notificationService.markAsRead(user.getId(), notificationId);
        return ResponseEntity.ok(Map.of("updated", updated));
    }
}

package com.marketplace.persistence;

import com.marketplace.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUser_IdOrderByCreatedAtDesc(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification notification
            set notification.isRead = true
            where notification.user.id = :userId
              and notification.isRead = false
            """)
    int markAllAsRead(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification notification
            set notification.isRead = true
            where notification.id = :notificationId
              and notification.user.id = :userId
              and notification.isRead = false
            """)
    int markAsRead(@Param("notificationId") Long notificationId, @Param("userId") Long userId);

    void deleteByRelatedEntityTypeAndRelatedEntityId(String relatedEntityType, Long relatedEntityId);
}

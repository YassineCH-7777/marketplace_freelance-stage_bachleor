package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversation_IdOrderByCreatedAtAsc(Long conversationId);
    Optional<Message> findTopByConversation_IdOrderByCreatedAtDesc(Long conversationId);

    @Query("""
            select count(m)
            from Message m
            where m.conversation.id = :conversationId
              and m.sender.id <> :userId
              and m.isRead = false
            """)
    long countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Message m
            set m.isRead = true
            where m.conversation.id = :conversationId
              and m.sender.id <> :userId
              and m.isRead = false
            """)
    int markConversationAsRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}

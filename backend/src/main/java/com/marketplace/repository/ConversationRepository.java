package com.marketplace.repository;

import com.marketplace.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByClient_IdOrFreelancer_User_Id(Long clientId, Long freelancerUserId);
    Optional<Conversation> findByClient_IdAndFreelancer_User_IdAndOrderIsNull(Long clientId, Long freelancerUserId);
}

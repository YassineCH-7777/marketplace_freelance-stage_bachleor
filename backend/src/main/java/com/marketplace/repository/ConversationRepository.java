package com.marketplace.repository;

import com.marketplace.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByClient_IdOrFreelancer_Id(Long clientId, Long freelancerId);
}

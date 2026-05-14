package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.model.ClientRequestDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientRequestDraftRepository extends JpaRepository<ClientRequestDraft, Long> {
    List<ClientRequestDraft> findByClient_IdOrderByUpdatedAtDesc(Long clientId);
}

package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    Optional<Attachment> findByStoredFileName(String storedFileName);

    List<Attachment> findByMessage_IdOrderByCreatedAtAsc(Long messageId);

    List<Attachment> findByServiceRequest_IdOrderByCreatedAtAsc(Long serviceRequestId);

    List<Attachment> findByOrder_IdOrderByCreatedAtAsc(Long orderId);
}

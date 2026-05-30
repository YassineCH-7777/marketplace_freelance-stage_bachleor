package com.marketplace.persistence;

import com.marketplace.enums.ProposalStatus;
import com.marketplace.model.Proposal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProposalRepository extends JpaRepository<Proposal, Long> {

    List<Proposal> findByServiceRequest_Id(Long serviceRequestId);

    List<Proposal> findByServiceRequest_IdOrderByCreatedAtDesc(Long serviceRequestId);

    List<Proposal> findByFreelancer_User_IdOrderByCreatedAtDesc(Long userId);

    boolean existsByServiceRequest_IdAndFreelancer_Id(Long serviceRequestId, Long freelancerId);

    List<Proposal> findByServiceRequest_IdAndStatus(Long serviceRequestId, ProposalStatus status);

    long countByServiceRequest_Id(Long serviceRequestId);
}

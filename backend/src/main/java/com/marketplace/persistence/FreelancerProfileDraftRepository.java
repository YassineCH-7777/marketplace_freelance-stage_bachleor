package com.marketplace.persistence;

import com.marketplace.model.FreelancerProfileDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FreelancerProfileDraftRepository extends JpaRepository<FreelancerProfileDraft, Long> {
    Optional<FreelancerProfileDraft> findByUser_Id(Long userId);
}

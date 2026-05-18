package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.model.MissionMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MissionMilestoneRepository extends JpaRepository<MissionMilestone, Long> {
    long countByOrder_Id(Long orderId);
    List<MissionMilestone> findByOrder_IdOrderBySortOrderAscCreatedAtAsc(Long orderId);
}

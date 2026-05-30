package com.marketplace.persistence;

import com.marketplace.model.MissionActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MissionActivityRepository extends JpaRepository<MissionActivity, Long> {
    List<MissionActivity> findByOrder_IdOrderByCreatedAtDesc(Long orderId);
}

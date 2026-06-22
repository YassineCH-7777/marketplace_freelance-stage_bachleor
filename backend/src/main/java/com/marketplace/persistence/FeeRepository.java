package com.marketplace.persistence;

import com.marketplace.model.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    Optional<Fee> findByOrder_Id(Long orderId);
    List<Fee> findAllByOrderByCreatedAtDesc();
}

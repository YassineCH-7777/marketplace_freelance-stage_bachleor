package com.marketplace.repository;

import com.marketplace.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByFreelancer_User_IdOrderByCreatedAtDesc(Long freelancerUserId);
    Optional<Review> findByOrder_Id(Long orderId);
}

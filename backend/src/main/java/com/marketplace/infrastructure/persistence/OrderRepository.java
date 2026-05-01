package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.model.Order;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    long countByStatus(OrderStatus status);
    List<Order> findByClient_Id(Long clientId);
    List<Order> findByFreelancer(FreelancerProfile freelancer);
}

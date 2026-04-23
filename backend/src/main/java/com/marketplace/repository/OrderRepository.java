package com.marketplace.repository;

import com.marketplace.entity.Order;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    long countByStatus(OrderStatus status);
    List<Order> findByClient_Id(Long clientId);
    List<Order> findByFreelancer(FreelancerProfile freelancer);
}

package com.marketplace.repository;

import com.marketplace.entity.OrderRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRequestRepository extends JpaRepository<OrderRequest, Long> {
    List<OrderRequest> findByFreelancer_Id(Long freelancerId);
    List<OrderRequest> findByClient_Id(Long clientId);
}

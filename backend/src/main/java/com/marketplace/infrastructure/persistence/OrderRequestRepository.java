package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.model.OrderRequest;
import com.marketplace.domain.model.ServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRequestRepository extends JpaRepository<OrderRequest, Long> {
    List<OrderRequest> findByClient_Id(Long clientId);
    List<OrderRequest> findByService_Freelancer_User_Id(Long freelancerUserId);
    boolean existsByClient_IdAndService(Long clientId, ServiceEntity service);
}

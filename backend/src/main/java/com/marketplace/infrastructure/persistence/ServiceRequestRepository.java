package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.enums.ServiceRequestStatus;
import com.marketplace.domain.model.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByStatus(ServiceRequestStatus status);

    List<ServiceRequest> findByClient_Id(Long clientId);

    List<ServiceRequest> findByCategory_Id(Long categoryId);

    List<ServiceRequest> findByStatusOrderByCreatedAtDesc(ServiceRequestStatus status);

    List<ServiceRequest> findByClient_IdOrderByCreatedAtDesc(Long clientId);
}

package com.marketplace.persistence;

import com.marketplace.enums.ServiceRequestStatus;
import com.marketplace.model.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByStatus(ServiceRequestStatus status);

    List<ServiceRequest> findByClient_Id(Long clientId);

    List<ServiceRequest> findByCategory_Id(Long categoryId);

    List<ServiceRequest> findByStatusOrderByCreatedAtDesc(ServiceRequestStatus status);

    List<ServiceRequest> findByClient_IdOrderByCreatedAtDesc(Long clientId);
}

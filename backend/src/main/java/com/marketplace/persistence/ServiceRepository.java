package com.marketplace.persistence;

import com.marketplace.model.ServiceEntity;
import com.marketplace.enums.ServiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {
    long countByStatus(ServiceStatus status);
    List<ServiceEntity> findByStatus(ServiceStatus status);
}

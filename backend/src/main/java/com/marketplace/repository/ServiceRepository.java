package com.marketplace.repository;

import com.marketplace.entity.ServiceEntity;
import com.marketplace.enums.ServiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {
    long countByStatus(ServiceStatus status);
    List<ServiceEntity> findByStatus(ServiceStatus status);

    @Query("SELECT s FROM ServiceEntity s WHERE s.status = 'ACTIVE' " +
           "AND (:keyword IS NULL OR LOWER(s.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:categoryId IS NULL OR s.category.id = :categoryId) " +
           "AND (:city IS NULL OR LOWER(s.freelancer.profile.city) LIKE LOWER(CONCAT('%', :city, '%')))")
    List<ServiceEntity> searchServices(@Param("keyword") String keyword, @Param("categoryId") Long categoryId, @Param("city") String city);
}

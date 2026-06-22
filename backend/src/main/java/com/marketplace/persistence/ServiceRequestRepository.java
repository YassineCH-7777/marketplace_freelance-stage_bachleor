package com.marketplace.persistence;

import com.marketplace.enums.ServiceRequestStatus;
import com.marketplace.model.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByStatus(ServiceRequestStatus status);

    List<ServiceRequest> findByClient_Id(Long clientId);

    List<ServiceRequest> findByCategory_Id(Long categoryId);

    List<ServiceRequest> findByStatusOrderByCreatedAtDesc(ServiceRequestStatus status);

    List<ServiceRequest> findByClient_IdOrderByCreatedAtDesc(Long clientId);

    @Query(value = """
            SELECT sr.*
            FROM service_requests sr
            WHERE sr.status = CAST(:status AS service_request_status)
              AND (
                    sr.is_remote = TRUE
                    OR (
                        sr.location IS NOT NULL
                        AND ST_DWithin(
                            sr.location,
                            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                            (LEAST(COALESCE(sr.request_radius_km, 5), :radiusKm) * 1000)::double precision
                        )
                    )
                  )
            ORDER BY sr.created_at DESC
            """, nativeQuery = true)
    List<ServiceRequest> findOpenRequestsNearPoint(
            @Param("status") String status,
            @Param("latitude") Double latitude,
            @Param("longitude") Double longitude,
            @Param("radiusKm") Integer radiusKm
    );
}

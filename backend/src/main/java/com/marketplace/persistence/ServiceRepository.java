package com.marketplace.persistence;

import com.marketplace.model.ServiceEntity;
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

    @Query(value = """
            SELECT s.*
            FROM services s
            WHERE s.status = CAST(:status AS service_status)
              AND s.location IS NOT NULL
              AND ST_DWithin(
                    s.location,
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                    (LEAST(COALESCE(s.service_radius_km, 10), :radiusKm) * 1000)::double precision
                  )
            """, nativeQuery = true)
    List<ServiceEntity> findLocalServicesCoveringPoint(
            @Param("status") String status,
            @Param("latitude") Double latitude,
            @Param("longitude") Double longitude,
            @Param("radiusKm") Integer radiusKm
    );
}

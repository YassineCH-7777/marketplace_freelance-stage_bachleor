package com.marketplace.infrastructure.persistence;

import com.marketplace.domain.model.ClientFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientFavoriteRepository extends JpaRepository<ClientFavorite, Long> {
    List<ClientFavorite> findByClient_IdOrderByCreatedAtDesc(Long clientId);

    Optional<ClientFavorite> findByClient_IdAndService_Id(Long clientId, Long serviceId);

    Optional<ClientFavorite> findByClient_IdAndFreelancer_User_Id(Long clientId, Long freelancerUserId);
}

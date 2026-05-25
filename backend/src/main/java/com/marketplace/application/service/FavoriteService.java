package com.marketplace.application.service;

import com.marketplace.domain.enums.UserRole;
import com.marketplace.domain.model.ClientFavorite;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.ServiceEntity;
import com.marketplace.domain.model.User;
import com.marketplace.infrastructure.persistence.ClientFavoriteRepository;
import com.marketplace.infrastructure.persistence.FreelancerProfileRepository;
import com.marketplace.infrastructure.persistence.ServiceRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
import com.marketplace.web.dto.favorite.FavoriteDto;
import com.marketplace.web.exception.BusinessException;
import com.marketplace.web.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final ClientFavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ServiceRepository serviceRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;

    @Transactional(readOnly = true)
    public List<FavoriteDto> getClientFavorites(Long clientId) {
        ensureClient(clientId);
        return favoriteRepository.findByClient_IdOrderByCreatedAtDesc(clientId)
                .stream()
                .map(FavoriteDto::from)
                .toList();
    }

    @Transactional
    public FavoriteDto addServiceFavorite(Long clientId, Long serviceId) {
        User client = ensureClient(clientId);
        ServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));

        return favoriteRepository.findByClient_IdAndService_Id(clientId, serviceId)
                .map(FavoriteDto::from)
                .orElseGet(() -> FavoriteDto.from(favoriteRepository.save(ClientFavorite.builder()
                        .client(client)
                        .service(service)
                        .build())));
    }

    @Transactional
    public void removeServiceFavorite(Long clientId, Long serviceId) {
        ensureClient(clientId);
        favoriteRepository.findByClient_IdAndService_Id(clientId, serviceId)
                .ifPresent(favoriteRepository::delete);
    }

    @Transactional
    public FavoriteDto addFreelancerFavorite(Long clientId, Long freelancerUserId) {
        User client = ensureClient(clientId);
        FreelancerProfile freelancer = freelancerProfileRepository.findByUserId(freelancerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));

        return favoriteRepository.findByClient_IdAndFreelancer_User_Id(clientId, freelancerUserId)
                .map(FavoriteDto::from)
                .orElseGet(() -> FavoriteDto.from(favoriteRepository.save(ClientFavorite.builder()
                        .client(client)
                        .freelancer(freelancer)
                        .build())));
    }

    @Transactional
    public void removeFreelancerFavorite(Long clientId, Long freelancerUserId) {
        ensureClient(clientId);
        favoriteRepository.findByClient_IdAndFreelancer_User_Id(clientId, freelancerUserId)
                .ifPresent(favoriteRepository::delete);
    }

    private User ensureClient(Long clientId) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));
        if (client.getRole() != UserRole.CLIENT) {
            throw new BusinessException("Seuls les clients peuvent gerer des favoris.", HttpStatus.FORBIDDEN);
        }
        return client;
    }
}

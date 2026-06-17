package com.marketplace.service;

import com.marketplace.enums.UserRole;
import com.marketplace.model.ClientFavorite;
import com.marketplace.model.FreelancerProfile;
import com.marketplace.model.ServiceEntity;
import com.marketplace.model.User;
import com.marketplace.persistence.ClientFavoriteRepository;
import com.marketplace.persistence.FreelancerProfileRepository;
import com.marketplace.persistence.ServiceRepository;
import com.marketplace.persistence.UserRepository;
import com.marketplace.dto.favorite.FavoriteDto;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
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

    /**
     * Liste les services et freelances favoris d'un client.
     */
    @Transactional(readOnly = true)
    public List<FavoriteDto> getClientFavorites(Long clientId) {
        ensureClient(clientId);
        return favoriteRepository.findByClient_IdOrderByCreatedAtDesc(clientId)
                .stream()
                .map(FavoriteDto::from)
                .toList();
    }

    /**
     * Ajoute un service aux favoris sans creer de doublon.
     */
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

    /**
     * Supprime un service des favoris si l'association existe.
     */
    @Transactional
    public void removeServiceFavorite(Long clientId, Long serviceId) {
        ensureClient(clientId);
        favoriteRepository.findByClient_IdAndService_Id(clientId, serviceId)
                .ifPresent(favoriteRepository::delete);
    }

    /**
     * Ajoute un freelance aux favoris sans creer de doublon.
     */
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

    /**
     * Supprime un freelance des favoris si l'association existe.
     */
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

package com.marketplace.service;

import com.marketplace.dto.service.ServiceDto;
import com.marketplace.entity.Category;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.User;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.CategoryRepository;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;

    @Transactional
    public ServiceDto createService(Long freelancerId, ServiceDto dto) {
        User freelancerUser = userRepository.findById(freelancerId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        FreelancerProfile freelancer = freelancerProfileRepository.findByUserId(freelancerId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));
        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("CatÃ©gorie introuvable"));

        ServiceEntity service = ServiceEntity.builder()
                .title(dto.getTitle())
                .slug(slugify(dto.getTitle()))
                .shortDescription(buildShortDescription(dto.getDescription()))
                .description(dto.getDescription())
                .price(dto.getPrice())
                .status(ServiceStatus.PUBLISHED)
                .category(category)
                .freelancer(freelancer)
                .city(freelancerUser.getCity() != null ? freelancerUser.getCity() : "Remote")
                .deliveryTimeDays(7)
                .remote(true)
                .build();

        return mapToDto(serviceRepository.save(service));
    }

    @Transactional
    public ServiceDto updateService(Long serviceId, Long freelancerId, ServiceDto dto) {
        ServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));
        if (!service.getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("AccÃ¨s refusÃ©");
        }

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("CatÃ©gorie introuvable"));

        service.setTitle(dto.getTitle());
        service.setSlug(slugify(dto.getTitle()));
        service.setShortDescription(buildShortDescription(dto.getDescription()));
        service.setDescription(dto.getDescription());
        service.setPrice(dto.getPrice());
        service.setCategory(category);

        return mapToDto(serviceRepository.save(service));
    }

    @Transactional
    public void deleteService(Long serviceId, Long freelancerId) {
        ServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));
        if (!service.getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("AccÃ¨s refusÃ©");
        }
        service.setStatus(ServiceStatus.ARCHIVED);
        serviceRepository.save(service);
    }

    private ServiceDto mapToDto(ServiceEntity service) {
        return ServiceDto.builder()
                .id(service.getId())
                .title(service.getTitle())
                .description(service.getDescription())
                .price(service.getPrice())
                .categoryId(service.getCategory().getId())
                .categoryName(service.getCategory().getName())
                .freelancerId(service.getFreelancer().getUser().getId())
                .freelancerEmail(service.getFreelancer().getUser().getEmail())
                .freelancerCity(service.getFreelancer().getUser().getCity())
                .status(service.getStatus() == ServiceStatus.PUBLISHED ? "ACTIVE" : service.getStatus().name())
                .build();
    }

    private String buildShortDescription(String description) {
        if (description == null || description.isBlank()) {
            return "Service freelance";
        }
        String normalized = description.trim();
        return normalized.length() <= 300 ? normalized : normalized.substring(0, 300);
    }

    private String slugify(String title) {
        if (title == null || title.isBlank()) {
            return "service";
        }
        String slug = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        String base = slug.isBlank() ? "service" : slug;
        return base + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}

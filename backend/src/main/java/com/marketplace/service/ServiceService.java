package com.marketplace.service;

import com.marketplace.dto.service.ServiceDto;
import com.marketplace.entity.Category;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.ServiceImage;
import com.marketplace.entity.User;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.CategoryRepository;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.ServiceImageRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;
    private final ServiceImageRepository serviceImageRepository;

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
                .city(resolveServiceCity(dto.getServiceCity(), freelancerUser.getCity(), resolveRemote(dto.getRemote(), true)))
                .deliveryTimeDays(resolveDeliveryTimeDays(dto.getDeliveryTimeDays(), 7))
                .coverImageUrl(normalizeOptionalText(dto.getCoverImageUrl()))
                .remote(resolveRemote(dto.getRemote(), true))
                .build();

        ServiceEntity savedService = serviceRepository.save(service);
        replaceGalleryImages(savedService, dto.getGalleryImageUrls());

        return mapToDto(savedService);
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
        service.setDeliveryTimeDays(resolveDeliveryTimeDays(dto.getDeliveryTimeDays(), service.getDeliveryTimeDays()));
        service.setCoverImageUrl(normalizeOptionalText(dto.getCoverImageUrl()));

        boolean remote = resolveRemote(dto.getRemote(), service.isRemote());
        service.setRemote(remote);
        service.setCity(resolveServiceCity(dto.getServiceCity(), service.getCity(), remote));

        ServiceEntity savedService = serviceRepository.save(service);
        replaceGalleryImages(savedService, dto.getGalleryImageUrls());

        return mapToDto(savedService);
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
                .serviceCity(service.getCity())
                .remote(service.isRemote())
                .deliveryTimeDays(service.getDeliveryTimeDays())
                .coverImageUrl(service.getCoverImageUrl())
                .galleryImageUrls(getGalleryImageUrls(service.getId()))
                .executionMode(resolveExecutionMode(service.isRemote(), service.getCity()))
                .status(service.getStatus() == ServiceStatus.PUBLISHED ? "ACTIVE" : service.getStatus().name())
                .build();
    }

    private Integer resolveDeliveryTimeDays(Integer requestedDays, Integer fallbackDays) {
        if (requestedDays != null && requestedDays >= 0) {
            return requestedDays;
        }

        if (fallbackDays != null && fallbackDays >= 0) {
            return fallbackDays;
        }

        return 7;
    }

    private boolean resolveRemote(Boolean requestedRemote, boolean fallbackRemote) {
        return requestedRemote != null ? requestedRemote : fallbackRemote;
    }

    private String resolveServiceCity(String requestedCity, String fallbackCity, boolean remote) {
        if (requestedCity != null && !requestedCity.isBlank()) {
            return requestedCity.trim();
        }

        if (fallbackCity != null && !fallbackCity.isBlank()) {
            return fallbackCity.trim();
        }

        return remote ? "Remote" : "A definir";
    }

    private String normalizeOptionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void replaceGalleryImages(ServiceEntity service, List<String> imageUrls) {
        if (service.getId() == null) {
            return;
        }

        serviceImageRepository.deleteByServiceId(service.getId());

        List<String> normalizedUrls = normalizeImageUrls(imageUrls);
        for (int index = 0; index < normalizedUrls.size(); index += 1) {
            serviceImageRepository.save(ServiceImage.builder()
                    .service(service)
                    .imageUrl(normalizedUrls.get(index))
                    .sortOrder(index)
                    .build());
        }
    }

    private List<String> getGalleryImageUrls(Long serviceId) {
        if (serviceId == null) {
            return List.of();
        }

        return serviceImageRepository.findByServiceIdOrderBySortOrderAsc(serviceId)
                .stream()
                .map(ServiceImage::getImageUrl)
                .toList();
    }

    private List<String> normalizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null) {
            return List.of();
        }

        return imageUrls.stream()
                .map(this::normalizeOptionalText)
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .toList();
    }

    private String resolveExecutionMode(boolean remote, String city) {
        if (!remote) {
            return "ON_SITE";
        }

        String normalizedCity = city == null ? "" : city.trim();
        if (!normalizedCity.isEmpty() && !"remote".equalsIgnoreCase(normalizedCity)) {
            return "HYBRID";
        }

        return "REMOTE";
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

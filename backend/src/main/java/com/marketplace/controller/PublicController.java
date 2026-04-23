package com.marketplace.controller;

import com.marketplace.dto.service.ServiceDto;
import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final ServiceRepository serviceRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;

    @GetMapping("/services")
    public ResponseEntity<List<ServiceDto>> getAllActiveServices() {
        // repository stores DB enum values (DRAFT, PUBLISHED...), map published to be shown as ACTIVE in UI
        List<ServiceDto> services = serviceRepository.findByStatus(ServiceStatus.PUBLISHED)
                .stream()
                .map(this::mapToServiceDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(services);
    }

    @GetMapping("/services/search")
    public ResponseEntity<List<ServiceDto>> searchServices(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String categoryName,
        @RequestParam(required = false) String city
    ) {
        String normalizedKeyword = normalize(keyword);
        String normalizedCategoryName = normalize(categoryName);
        String normalizedCity = normalize(city);

        List<ServiceDto> services = serviceRepository.findByStatus(ServiceStatus.PUBLISHED)
                .stream()
                .filter(service -> normalizedKeyword == null
                        || containsIgnoreCase(service.getTitle(), normalizedKeyword)
                        || containsIgnoreCase(service.getDescription(), normalizedKeyword))
                .filter(service -> (categoryId == null && normalizedCategoryName == null)
                        || service.getCategory().getId().equals(categoryId)
                        || containsIgnoreCase(service.getCategory().getName(), normalizedCategoryName))
                .filter(service -> normalizedCity == null
                        || containsIgnoreCase(service.getCity(), normalizedCity)
                        || containsIgnoreCase(service.getFreelancer().getUser().getCity(), normalizedCity))
                .map(this::mapToServiceDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(services);
    }

    @GetMapping("/freelancers/{userId}")
    public ResponseEntity<FreelancerProfileDto> getFreelancerProfile(@PathVariable Long userId) {
        return freelancerProfileRepository.findByUserId(userId)
                .map(this::mapToProfileDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private ServiceDto mapToServiceDto(ServiceEntity service) {
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
                .status("ACTIVE")
                .build();
    }

    private FreelancerProfileDto mapToProfileDto(FreelancerProfile profile) {
        return FreelancerProfileDto.builder()
                .id(profile.getId())
                .email(profile.getUser().getEmail())
                .bio(profile.getBio())
                .city(profile.getUser().getCity())
                .portfolioUrl(profile.getPortfolioUrl())
                .skills(String.join(",", profile.getSkills()))
                .build();
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private boolean containsIgnoreCase(String value, String expected) {
        return expected == null || (value != null && value.toLowerCase(Locale.ROOT).contains(expected));
    }
}

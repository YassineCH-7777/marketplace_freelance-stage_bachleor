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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final ServiceRepository serviceRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;

    @GetMapping("/services")
    public ResponseEntity<List<ServiceDto>> getAllActiveServices() {
        List<ServiceDto> services = serviceRepository.findByStatus(ServiceStatus.ACTIVE)
                .stream()
                .map(this::mapToServiceDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(services);
    }

    @GetMapping("/services/search")
    public ResponseEntity<List<ServiceDto>> searchServices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String city
    ) {
        List<ServiceDto> services = serviceRepository.searchServices(keyword, categoryId, city)
                .stream()
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
                .freelancerId(service.getFreelancer().getId())
                .freelancerEmail(service.getFreelancer().getEmail())
                .freelancerCity(service.getFreelancer().getCity())
                .build();
    }

    private FreelancerProfileDto mapToProfileDto(FreelancerProfile profile) {
        return FreelancerProfileDto.builder()
                .id(profile.getId())
                .email(profile.getUser().getEmail())
                .bio(profile.getBio())
                .city(profile.getUser().getCity())
                .portfolioUrl(profile.getPortfolioUrl())
                .skills(profile.getSkills())
                .build();
    }
}

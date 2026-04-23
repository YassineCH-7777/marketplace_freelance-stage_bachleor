package com.marketplace.service;

import com.marketplace.dto.service.ServiceDto;
import com.marketplace.entity.Category;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.User;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.repository.CategoryRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public ServiceDto createService(Long freelancerId, ServiceDto dto) {
    User freelancer = userRepository.findById(freelancerId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
    Category category = categoryRepository.findById(dto.getCategoryId()).orElseThrow(() -> new ResourceNotFoundException("Catégorie introuvable"));

        ServiceEntity service = ServiceEntity.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .status(ServiceStatus.PUBLISHED)
                .category(category)
                .freelancer(freelancer)
                .build();
        
        service = serviceRepository.save(service);
        return mapToDto(service);
    }

    @Transactional
    public ServiceDto updateService(Long serviceId, Long freelancerId, ServiceDto dto) {
        ServiceEntity service = serviceRepository.findById(serviceId).orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));
        if (!service.getFreelancer().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Accès refusé");
        }
        Category category = categoryRepository.findById(dto.getCategoryId()).orElseThrow(() -> new ResourceNotFoundException("Catégorie introuvable"));
        
        service.setTitle(dto.getTitle());
        service.setDescription(dto.getDescription());
        service.setPrice(dto.getPrice());
        service.setCategory(category);
        
        return mapToDto(serviceRepository.save(service));
    }

    @Transactional
    public void deleteService(Long serviceId, Long freelancerId) {
        ServiceEntity service = serviceRepository.findById(serviceId).orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));
        if (!service.getFreelancer().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Accès refusé");
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
                .freelancerId(service.getFreelancer().getId())
                .build();
    }
}

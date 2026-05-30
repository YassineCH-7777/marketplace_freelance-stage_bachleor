package com.marketplace.service;

import com.marketplace.enums.ServiceRequestStatus;
import com.marketplace.model.Category;
import com.marketplace.model.ServiceRequest;
import com.marketplace.model.User;
import com.marketplace.persistence.AttachmentRepository;
import com.marketplace.persistence.CategoryRepository;
import com.marketplace.persistence.ProposalRepository;
import com.marketplace.persistence.ServiceRequestRepository;
import com.marketplace.persistence.UserRepository;
import com.marketplace.dto.attachment.AttachmentDto;
import com.marketplace.dto.request.ServiceRequestDto;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final ProposalRepository proposalRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final AttachmentRepository attachmentRepository;

    @Transactional
    public ServiceRequestDto createServiceRequest(Long clientId, ServiceRequestDto dto) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Categorie introuvable"));

        String title = normalizeRequiredText(dto.getTitle(), "Le titre est obligatoire.");
        String description = normalizeRequiredText(dto.getDescription(), "La description est obligatoire.");

        if (title.length() < 3) {
            throw new BusinessException("Le titre doit contenir au moins 3 caracteres.", HttpStatus.BAD_REQUEST);
        }
        if (description.length() < 10) {
            throw new BusinessException("La description doit contenir au moins 10 caracteres.", HttpStatus.BAD_REQUEST);
        }

        validateBudgetRange(dto);

        ServiceRequest request = ServiceRequest.builder()
                .client(client)
                .category(category)
                .title(title)
                .description(description)
                .budgetMin(dto.getBudgetMin())
                .budgetMax(dto.getBudgetMax())
                .deadline(dto.getDeadline())
                .city(normalizeOptionalText(dto.getCity()))
                .remote(dto.isRemote())
                .urgent(dto.isUrgent())
                .requiredSkills(dto.getRequiredSkills() != null ? dto.getRequiredSkills() : List.of())
                .status(ServiceRequestStatus.OPEN)
                .build();

        ServiceRequest saved = serviceRequestRepository.save(request);
        return mapToDto(saved, true);
    }

    @Transactional(readOnly = true)
    public List<ServiceRequestDto> getOpenServiceRequests() {
        return serviceRequestRepository.findByStatusOrderByCreatedAtDesc(ServiceRequestStatus.OPEN)
                .stream()
                .map(sr -> mapToDto(sr, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServiceRequestDto> getClientServiceRequests(Long clientId) {
        return serviceRequestRepository.findByClient_IdOrderByCreatedAtDesc(clientId)
                .stream()
                .map(sr -> mapToDto(sr, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ServiceRequestDto getServiceRequestDetail(Long requestId) {
        ServiceRequest request = findById(requestId);
        return mapToDto(request, true);
    }

    @Transactional(readOnly = true)
    public List<ServiceRequestDto> searchServiceRequests(
            String keyword, Long categoryId, String city, Boolean isUrgent) {
        String normalizedKeyword = normalize(keyword);
        String normalizedCity = normalize(city);

        return serviceRequestRepository.findByStatusOrderByCreatedAtDesc(ServiceRequestStatus.OPEN)
                .stream()
                .filter(sr -> normalizedKeyword == null
                        || containsIgnoreCase(sr.getTitle(), normalizedKeyword)
                        || containsIgnoreCase(sr.getDescription(), normalizedKeyword))
                .filter(sr -> categoryId == null
                        || sr.getCategory().getId().equals(categoryId))
                .filter(sr -> normalizedCity == null
                        || containsIgnoreCase(sr.getCity(), normalizedCity))
                .filter(sr -> isUrgent == null || sr.isUrgent() == isUrgent)
                .map(sr -> mapToDto(sr, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public ServiceRequestDto updateServiceRequest(Long requestId, Long clientId, ServiceRequestDto dto) {
        ServiceRequest request = findById(requestId);
        ensureOwnership(request, clientId);

        if (request.getStatus() != ServiceRequestStatus.OPEN && request.getStatus() != ServiceRequestStatus.IN_DISCUSSION) {
            throw new BusinessException("Seules les demandes ouvertes peuvent etre modifiees.", HttpStatus.BAD_REQUEST);
        }

        if (dto.getTitle() != null) {
            String title = normalizeRequiredText(dto.getTitle(), "Le titre est obligatoire.");
            if (title.length() < 3) {
                throw new BusinessException("Le titre doit contenir au moins 3 caracteres.", HttpStatus.BAD_REQUEST);
            }
            request.setTitle(title);
        }
        if (dto.getDescription() != null) {
            String description = normalizeRequiredText(dto.getDescription(), "La description est obligatoire.");
            if (description.length() < 10) {
                throw new BusinessException("La description doit contenir au moins 10 caracteres.", HttpStatus.BAD_REQUEST);
            }
            request.setDescription(description);
        }
        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Categorie introuvable"));
            request.setCategory(category);
        }
        if (dto.getBudgetMin() != null) {
            request.setBudgetMin(dto.getBudgetMin());
        }
        if (dto.getBudgetMax() != null) {
            request.setBudgetMax(dto.getBudgetMax());
        }
        if (dto.getDeadline() != null) {
            request.setDeadline(dto.getDeadline());
        }
        if (dto.getCity() != null) {
            request.setCity(normalizeOptionalText(dto.getCity()));
        }
        request.setRemote(dto.isRemote());
        request.setUrgent(dto.isUrgent());
        if (dto.getRequiredSkills() != null) {
            request.setRequiredSkills(dto.getRequiredSkills());
        }

        return mapToDto(serviceRequestRepository.save(request), true);
    }

    @Transactional
    public void cancelServiceRequest(Long requestId, Long clientId) {
        ServiceRequest request = findById(requestId);
        ensureOwnership(request, clientId);

        if (request.getStatus() == ServiceRequestStatus.COMPLETED || request.getStatus() == ServiceRequestStatus.CANCELLED) {
            throw new BusinessException("Cette demande est deja cloturee.", HttpStatus.BAD_REQUEST);
        }

        request.setStatus(ServiceRequestStatus.CANCELLED);
        serviceRequestRepository.save(request);
    }

    public ServiceRequest findById(Long id) {
        return serviceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
    }

    public void ensureOwnership(ServiceRequest request, Long clientId) {
        if (!request.getClient().getId().equals(clientId)) {
            throw new UnauthorizedException("Acces refuse");
        }
    }

    // --- Mapping ---

    public ServiceRequestDto mapToDto(ServiceRequest sr, boolean includeProposals) {
        ServiceRequestDto.ServiceRequestDtoBuilder builder = ServiceRequestDto.builder()
                .id(sr.getId())
                .clientId(sr.getClient().getId())
                .clientEmail(sr.getClient().getEmail())
                .clientFirstName(sr.getClient().getFirstName())
                .clientLastName(sr.getClient().getLastName())
                .clientCity(sr.getClient().getCity())
                .categoryId(sr.getCategory().getId())
                .categoryName(sr.getCategory().getName())
                .title(sr.getTitle())
                .description(sr.getDescription())
                .budgetMin(sr.getBudgetMin())
                .budgetMax(sr.getBudgetMax())
                .deadline(sr.getDeadline())
                .city(sr.getCity())
                .remote(sr.isRemote())
                .urgent(sr.isUrgent())
                .requiredSkills(sr.getRequiredSkills())
                .status(sr.getStatus())
                .proposalCount(proposalRepository.countByServiceRequest_Id(sr.getId()))
                .attachments(safeList(attachmentRepository.findByServiceRequest_IdOrderByCreatedAtAsc(sr.getId()))
                        .stream()
                        .map(AttachmentDto::from)
                        .toList())
                .createdAt(sr.getCreatedAt())
                .updatedAt(sr.getUpdatedAt());

        if (includeProposals) {
            builder.proposals(
                    proposalRepository.findByServiceRequest_IdOrderByCreatedAtDesc(sr.getId())
                            .stream()
                            .map(ProposalService::mapProposalToDto)
                            .toList()
            );
        }

        return builder.build();
    }

    // --- Utilities ---

    private void validateBudgetRange(ServiceRequestDto dto) {
        if (dto.getBudgetMin() != null && dto.getBudgetMax() != null
                && dto.getBudgetMax().compareTo(dto.getBudgetMin()) < 0) {
            throw new BusinessException("Le budget max doit etre superieur ou egal au budget min.", HttpStatus.BAD_REQUEST);
        }
    }

    private String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private boolean containsIgnoreCase(String value, String expected) {
        return expected == null || (value != null && value.toLowerCase(Locale.ROOT).contains(expected));
    }

    private String normalizeRequiredText(String value, String errorMessage) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private <T> List<T> safeList(List<T> values) {
        return values != null ? values : List.of();
    }
}

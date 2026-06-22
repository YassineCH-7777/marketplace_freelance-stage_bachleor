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

    private static final int DEFAULT_REQUEST_RADIUS_KM = 5;
    private static final int DEFAULT_SEARCH_RADIUS_KM = 10;
    private static final int MAX_RADIUS_KM = 50;

    private final ServiceRequestRepository serviceRequestRepository;
    private final ProposalRepository proposalRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final AttachmentRepository attachmentRepository;

    /**
     * Cree une demande publique client avec validation du contenu, du budget et de la categorie.
     */
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
        String executionMode = resolveExecutionMode(dto);
        boolean remote = !"ON_SITE".equals(executionMode);
        String city = resolveRequestCity(dto.getCity(), client.getCity(), executionMode);
        boolean localCoverage = !"REMOTE".equals(executionMode);

        ServiceRequest request = ServiceRequest.builder()
                .client(client)
                .category(category)
                .title(title)
                .description(description)
                .budgetMin(dto.getBudgetMin())
                .budgetMax(dto.getBudgetMax())
                .deadline(dto.getDeadline())
                .city(city)
                .remote(remote)
                .latitude(resolveLatitude(dto.getLatitude(), null, localCoverage))
                .longitude(resolveLongitude(dto.getLongitude(), null, localCoverage))
                .requestRadiusKm(normalizeRadiusKm(dto.getRequestRadiusKm(), DEFAULT_REQUEST_RADIUS_KM))
                .urgent(dto.isUrgent())
                .requiredSkills(dto.getRequiredSkills() != null ? dto.getRequiredSkills() : List.of())
                .status(ServiceRequestStatus.OPEN)
                .build();

        ServiceRequest saved = serviceRequestRepository.save(request);
        return mapToDto(saved, true);
    }

    /**
     * Liste les demandes encore ouvertes que les freelances peuvent consulter.
     */
    @Transactional(readOnly = true)
    public List<ServiceRequestDto> getOpenServiceRequests() {
        return serviceRequestRepository.findByStatusOrderByCreatedAtDesc(ServiceRequestStatus.OPEN)
                .stream()
                .map(sr -> mapToDto(sr, false))
                .collect(Collectors.toList());
    }

    /**
     * Recupere l'historique des demandes creees par un client.
     */
    @Transactional(readOnly = true)
    public List<ServiceRequestDto> getClientServiceRequests(Long clientId) {
        return serviceRequestRepository.findByClient_IdOrderByCreatedAtDesc(clientId)
                .stream()
                .map(sr -> mapToDto(sr, false))
                .collect(Collectors.toList());
    }

    /**
     * Charge le detail d'une demande avec les candidatures lorsque necessaire.
     */
    @Transactional(readOnly = true)
    public ServiceRequestDto getServiceRequestDetail(Long requestId) {
        ServiceRequest request = findById(requestId);
        return mapToDto(request, true);
    }

    /**
     * Filtre les demandes ouvertes selon les criteres de recherche publics.
     */
    @Transactional(readOnly = true)
    public List<ServiceRequestDto> searchServiceRequests(
            String keyword, Long categoryId, String city, Boolean isUrgent,
            Double latitude, Double longitude, Integer radiusKm) {
        String normalizedKeyword = normalize(keyword);
        String normalizedCity = normalize(city);
        boolean hasGeoSearch = latitude != null || longitude != null;
        List<ServiceRequest> sourceRequests = hasGeoSearch
                ? findRequestsNearPoint(latitude, longitude, radiusKm)
                : serviceRequestRepository.findByStatusOrderByCreatedAtDesc(ServiceRequestStatus.OPEN);

        return sourceRequests
                .stream()
                .filter(sr -> normalizedKeyword == null
                        || containsIgnoreCase(sr.getTitle(), normalizedKeyword)
                        || containsIgnoreCase(sr.getDescription(), normalizedKeyword))
                .filter(sr -> categoryId == null
                        || sr.getCategory().getId().equals(categoryId))
                .filter(sr -> normalizedCity == null
                        || hasGeoSearch
                        || sr.isRemote()
                        || containsIgnoreCase(sr.getCity(), normalizedCity))
                .filter(sr -> isUrgent == null || sr.isUrgent() == isUrgent)
                .map(sr -> mapToDto(sr, false))
                .collect(Collectors.toList());
    }

    /**
     * Met a jour une demande uniquement si le client en est proprietaire et si elle reste modifiable.
     */
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
        String executionMode = dto.getExecutionMode() != null ? resolveExecutionMode(dto) : resolveExecutionMode(request);
        boolean remote = !"ON_SITE".equals(executionMode);
        String city = dto.getCity() != null
                ? resolveRequestCity(dto.getCity(), request.getClient().getCity(), executionMode)
                : resolveRequestCity(request.getCity(), request.getClient().getCity(), executionMode);
        boolean localCoverage = !"REMOTE".equals(executionMode);

        request.setCity(city);
        request.setRemote(remote);
        request.setLatitude(resolveLatitude(dto.getLatitude(), request.getLatitude(), localCoverage));
        request.setLongitude(resolveLongitude(dto.getLongitude(), request.getLongitude(), localCoverage));
        request.setRequestRadiusKm(normalizeRadiusKm(dto.getRequestRadiusKm(), request.getRequestRadiusKm()));
        request.setUrgent(dto.isUrgent());
        if (dto.getRequiredSkills() != null) {
            request.setRequiredSkills(dto.getRequiredSkills());
        }

        return mapToDto(serviceRequestRepository.save(request), true);
    }

    /**
     * Annule une demande qui n'est pas deja terminee ou annulee.
     */
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

    /**
     * Recherche une demande ou leve une exception metier si elle n'existe pas.
     */
    public ServiceRequest findById(Long id) {
        return serviceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
    }

    /**
     * Verifie que le client connecte est bien le proprietaire de la demande.
     */
    public void ensureOwnership(ServiceRequest request, Long clientId) {
        if (!request.getClient().getId().equals(clientId)) {
            throw new UnauthorizedException("Acces refuse");
        }
    }

    // --- Mapping ---

    /**
     * Convertit une demande en DTO et ajoute les propositions seulement quand l'ecran en a besoin.
     */
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
                .executionMode(resolveExecutionMode(sr))
                .latitude(sr.getLatitude())
                .longitude(sr.getLongitude())
                .requestRadiusKm(resolveRadiusKm(sr.getRequestRadiusKm(), DEFAULT_REQUEST_RADIUS_KM))
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

    private List<ServiceRequest> findRequestsNearPoint(Double latitude, Double longitude, Integer radiusKm) {
        validateCoordinate(latitude, -90, 90, "La latitude de recherche est invalide.");
        validateCoordinate(longitude, -180, 180, "La longitude de recherche est invalide.");

        return serviceRequestRepository.findOpenRequestsNearPoint(
                ServiceRequestStatus.OPEN.name(),
                latitude,
                longitude,
                normalizeRadiusKm(radiusKm, DEFAULT_SEARCH_RADIUS_KM)
        );
    }

    private String resolveExecutionMode(ServiceRequestDto dto) {
        String mode = normalize(dto.getExecutionMode());
        if (mode != null) {
            return switch (mode) {
                case "on_site", "onsite", "sur place", "local" -> "ON_SITE";
                case "hybrid", "hybride" -> "HYBRID";
                case "remote", "a distance", "distance" -> "REMOTE";
                default -> throw new BusinessException("Mode de mission invalide.", HttpStatus.BAD_REQUEST);
            };
        }

        return dto.isRemote() ? "REMOTE" : "ON_SITE";
    }

    private String resolveExecutionMode(ServiceRequest request) {
        if (!request.isRemote()) {
            return "ON_SITE";
        }

        String city = normalize(request.getCity());
        return city == null || "remote".equals(city) ? "REMOTE" : "HYBRID";
    }

    private String resolveRequestCity(String requestedCity, String fallbackCity, String executionMode) {
        if ("REMOTE".equals(executionMode)) {
            return "Remote";
        }

        String city = normalizeOptionalText(requestedCity);
        if (city != null) {
            return city;
        }

        city = normalizeOptionalText(fallbackCity);
        if (city != null) {
            return city;
        }

        throw new BusinessException("Indiquez la ville ou le quartier de la mission.", HttpStatus.BAD_REQUEST);
    }

    private Double resolveLatitude(Double requestedValue, Double fallbackValue, boolean localCoverage) {
        if (!localCoverage) {
            return null;
        }

        Double value = requestedValue != null ? requestedValue : fallbackValue;
        return validateCoordinate(value, -90, 90, "Choisissez un point valide sur la carte.");
    }

    private Double resolveLongitude(Double requestedValue, Double fallbackValue, boolean localCoverage) {
        if (!localCoverage) {
            return null;
        }

        Double value = requestedValue != null ? requestedValue : fallbackValue;
        return validateCoordinate(value, -180, 180, "Choisissez un point valide sur la carte.");
    }

    private Double validateCoordinate(Double value, double min, double max, String message) {
        if (value == null || value < min || value > max) {
            throw new BusinessException(message, HttpStatus.BAD_REQUEST);
        }

        return value;
    }

    private Integer normalizeRadiusKm(Integer requestedRadiusKm, Integer fallbackRadiusKm) {
        int radiusKm = requestedRadiusKm != null ? requestedRadiusKm : resolveRadiusKm(fallbackRadiusKm, DEFAULT_REQUEST_RADIUS_KM);
        if (radiusKm < 1 || radiusKm > MAX_RADIUS_KM) {
            throw new BusinessException("Le rayon doit etre compris entre 1 et 50 km.", HttpStatus.BAD_REQUEST);
        }

        return radiusKm;
    }

    private Integer resolveRadiusKm(Integer radiusKm, Integer fallbackRadiusKm) {
        if (radiusKm == null || radiusKm < 1 || radiusKm > MAX_RADIUS_KM) {
            return fallbackRadiusKm;
        }

        return radiusKm;
    }

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

package com.marketplace.controller;

import com.marketplace.dto.service.ServiceDto;
import com.marketplace.dto.service.CategoryDto;
import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.dto.review.ReviewDto;
import com.marketplace.model.FreelancerProfile;
import com.marketplace.model.ServiceEntity;
import com.marketplace.model.ServiceImage;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.exception.BusinessException;
import com.marketplace.persistence.CategoryRepository;
import com.marketplace.persistence.FreelancerProfileRepository;
import com.marketplace.persistence.ServiceImageRepository;
import com.marketplace.persistence.ServiceRepository;
import com.marketplace.service.ReviewService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private static final int DEFAULT_SEARCH_RADIUS_KM = 10;
    private static final int MAX_SEARCH_RADIUS_KM = 50;

    private final ServiceRepository serviceRepository;
    private final CategoryRepository categoryRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;
    private final ServiceImageRepository serviceImageRepository;
    private final ReviewService reviewService;

    /**
     * Expose les services publies dans le catalogue public.
     */
    @GetMapping("/services")
    public ResponseEntity<List<ServiceDto>> getAllActiveServices() {
        // repository stores DB enum values (DRAFT, PUBLISHED...), map published to be shown as ACTIVE in UI
        List<ServiceDto> services = serviceRepository.findByStatus(ServiceStatus.PUBLISHED)
                .stream()
                .map(this::mapToServiceDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(services);
    }

    /**
     * Retourne uniquement les categories actives visibles par les visiteurs.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDto>> getActiveCategories() {
        List<CategoryDto> categories = categoryRepository.findAll()
                .stream()
                .filter(category -> category.isActive())
                .map(category -> CategoryDto.builder()
                        .id(category.getId())
                        .name(category.getName())
                        .description(category.getDescription())
                        .isActive(category.isActive())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(categories);
    }

    /**
     * Recherche les services selon le besoin local: mot-cle, categorie, ville, mode et delai.
     */
    @GetMapping("/services/search")
    public ResponseEntity<List<ServiceDto>> searchServices(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String categoryName,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) String mode,
        @RequestParam(required = false) Integer maxDeliveryDays,
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng,
        @RequestParam(required = false) Double latitude,
        @RequestParam(required = false) Double longitude,
        @RequestParam(required = false) Integer radiusKm
    ) {
        String normalizedKeyword = normalize(keyword);
        String normalizedCategoryName = normalize(categoryName);
        String normalizedCity = normalize(city);
        String normalizedMode = normalize(mode);
        Double searchLatitude = firstCoordinate(lat, latitude);
        Double searchLongitude = firstCoordinate(lng, longitude);
        Set<Long> localServiceIds = resolveLocalServiceIds(searchLatitude, searchLongitude, radiusKm);
        boolean hasGeoSearch = searchLatitude != null && searchLongitude != null;

        List<ServiceDto> services = serviceRepository.findByStatus(ServiceStatus.PUBLISHED)
                .stream()
                .filter(service -> normalizedKeyword == null
                        || containsIgnoreCase(service.getTitle(), normalizedKeyword)
                        || containsIgnoreCase(service.getDescription(), normalizedKeyword))
                .filter(service -> (categoryId == null && normalizedCategoryName == null)
                        || service.getCategory().getId().equals(categoryId)
                        || containsIgnoreCase(service.getCategory().getName(), normalizedCategoryName))
                .filter(service -> matchesLocation(service, normalizedCity, localServiceIds, hasGeoSearch))
                .filter(service -> matchesMode(service, normalizedMode))
                .filter(service -> maxDeliveryDays == null
                        || (service.getDeliveryTimeDays() != null && service.getDeliveryTimeDays() <= maxDeliveryDays))
                .map(this::mapToServiceDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(services);
    }

    /**
     * Affiche le profil public d'un freelance a partir de son identifiant utilisateur.
     */
    @GetMapping("/freelancers/{userId}")
    public ResponseEntity<FreelancerProfileDto> getFreelancerProfile(@PathVariable Long userId) {
        return freelancerProfileRepository.findByUserId(userId)
                .map(this::mapToProfileDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Liste les avis publics attaches au freelance.
     */
    @GetMapping("/freelancers/{userId}/reviews")
    public ResponseEntity<List<ReviewDto>> getFreelancerReviews(@PathVariable Long userId) {
        return ResponseEntity.ok(reviewService.getReviewsByFreelancer(userId));
    }

    /**
     * Convertit une entite service en DTO public sans exposer le modele JPA.
     */
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
                .serviceCity(service.getCity())
                .remote(service.isRemote())
                .latitude(service.getLatitude())
                .longitude(service.getLongitude())
                .serviceRadiusKm(resolveServiceRadiusKm(service.getServiceRadiusKm()))
                .deliveryTimeDays(service.getDeliveryTimeDays())
                .coverImageUrl(service.getCoverImageUrl())
                .galleryImageUrls(getGalleryImageUrls(service.getId()))
                .executionMode(resolveExecutionMode(service))
                .status("ACTIVE")
                .build();
    }

    /**
     * Recupere les images de galerie dans l'ordre prevu pour l'affichage public.
     */
    private List<String> getGalleryImageUrls(Long serviceId) {
        return serviceImageRepository.findByServiceIdOrderBySortOrderAsc(serviceId)
                .stream()
                .map(ServiceImage::getImageUrl)
                .collect(Collectors.toList());
    }

    /**
     * Transforme le profil freelance interne en donnees publiques consultables.
     */
    private FreelancerProfileDto mapToProfileDto(FreelancerProfile profile) {
        return FreelancerProfileDto.builder()
                .id(profile.getId())
                .email(profile.getUser().getEmail())
                .firstName(profile.getUser().getFirstName())
                .lastName(profile.getUser().getLastName())
                .phone(profile.getUser().getPhone())
                .headline(profile.getHeadline())
                .bio(profile.getBio())
                .city(profile.getUser().getCity())
                .searchCity(profile.getUser().getSearchCity())
                .searchPlaceId(profile.getUser().getSearchPlaceId())
                .searchLatitude(profile.getUser().getSearchLatitude())
                .searchLongitude(profile.getUser().getSearchLongitude())
                .searchRadiusKm(profile.getUser().getSearchRadiusKm())
                .portfolioUrl(profile.getPortfolioUrl())
                .skills(profile.getSkills() == null ? "" : String.join(",", profile.getSkills()))
                .build();
    }

    /**
     * Normalise une valeur de filtre afin de comparer sans tenir compte de la casse.
     */
    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    /**
     * Verifie qu'un texte contient le filtre attendu en ignorant la casse.
     */
    private boolean containsIgnoreCase(String value, String expected) {
        return expected == null || (value != null && value.toLowerCase(Locale.ROOT).contains(expected));
    }

    /**
     * Compare le mode d'execution calcule avec le filtre demande.
     */
    private boolean matchesMode(ServiceEntity service, String expectedMode) {
        if (expectedMode == null) {
            return true;
        }

        return resolveExecutionMode(service).toLowerCase(Locale.ROOT).equals(expectedMode);
    }

    /**
     * Applique soit le filtre PostGIS, soit le filtre ville historique.
     */
    private boolean matchesLocation(ServiceEntity service, String normalizedCity, Set<Long> localServiceIds, boolean hasGeoSearch) {
        if (hasGeoSearch) {
            return service.isRemote() || localServiceIds.contains(service.getId());
        }

        return normalizedCity == null
                || service.isRemote()
                || containsIgnoreCase(service.getCity(), normalizedCity)
                || containsIgnoreCase(service.getFreelancer().getUser().getCity(), normalizedCity);
    }

    private Set<Long> resolveLocalServiceIds(Double latitude, Double longitude, Integer radiusKm) {
        if (latitude == null && longitude == null) {
            return Set.of();
        }

        if (latitude == null || longitude == null) {
            throw new BusinessException("Les coordonnees de recherche sont incompletes.", HttpStatus.BAD_REQUEST);
        }

        validateCoordinate(latitude, -90, 90, "La latitude de recherche est invalide.");
        validateCoordinate(longitude, -180, 180, "La longitude de recherche est invalide.");

        return serviceRepository.findLocalServicesCoveringPoint(
                        ServiceStatus.PUBLISHED.name(),
                        latitude,
                        longitude,
                        resolveSearchRadiusKm(radiusKm)
                )
                .stream()
                .map(ServiceEntity::getId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private Double firstCoordinate(Double primary, Double fallback) {
        return primary != null ? primary : fallback;
    }

    private void validateCoordinate(Double value, double min, double max, String message) {
        if (value == null || value < min || value > max) {
            throw new BusinessException(message, HttpStatus.BAD_REQUEST);
        }
    }

    private Integer resolveSearchRadiusKm(Integer radiusKm) {
        if (radiusKm == null) {
            return DEFAULT_SEARCH_RADIUS_KM;
        }

        if (radiusKm < 1 || radiusKm > MAX_SEARCH_RADIUS_KM) {
            throw new BusinessException("Le rayon de recherche doit etre compris entre 1 et 50 km.", HttpStatus.BAD_REQUEST);
        }

        return radiusKm;
    }

    private Integer resolveServiceRadiusKm(Integer radiusKm) {
        if (radiusKm == null || radiusKm < 1 || radiusKm > MAX_SEARCH_RADIUS_KM) {
            return DEFAULT_SEARCH_RADIUS_KM;
        }

        return radiusKm;
    }

    /**
     * Deduit le mode ON_SITE, HYBRID ou REMOTE a partir des donnees du service.
     */
    private String resolveExecutionMode(ServiceEntity service) {
        if (!service.isRemote()) {
            return "ON_SITE";
        }

        String normalizedCity = normalize(service.getCity());
        if (normalizedCity != null && !"remote".equals(normalizedCity)) {
            return "HYBRID";
        }

        return "REMOTE";
    }
}

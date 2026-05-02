package com.marketplace.application.service;

import com.marketplace.domain.enums.ServiceStatus;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.ServiceEntity;
import com.marketplace.domain.model.ServiceImage;
import com.marketplace.infrastructure.persistence.ServiceImageRepository;
import com.marketplace.infrastructure.persistence.ServiceRepository;
import com.marketplace.web.dto.recommendation.RecommendationRequestDto;
import com.marketplace.web.dto.recommendation.RecommendationResultDto;
import com.marketplace.web.dto.service.ServiceDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final int DEFAULT_LIMIT = 8;
    private static final int MAX_LIMIT = 30;
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");

    private static final Set<String> STOP_WORDS = Set.of(
            "avec", "avoir", "besoin", "dans", "de", "des", "du", "en", "et", "faire", "je", "la", "le",
            "les", "mon", "pour", "sur", "un", "une", "votre", "vous", "the", "and", "for", "with"
    );

    private static final Map<String, List<String>> TOKEN_ALIASES = Map.ofEntries(
            Map.entry("site", List.of("web", "vitrine")),
            Map.entry("web", List.of("site", "developpement")),
            Map.entry("application", List.of("app", "logiciel")),
            Map.entry("logo", List.of("branding", "identite")),
            Map.entry("photo", List.of("photographie", "shooting")),
            Map.entry("video", List.of("montage", "reels")),
            Map.entry("restaurant", List.of("commerce", "local")),
            Map.entry("seo", List.of("visibilite", "referencement")),
            Map.entry("reseau", List.of("wifi", "informatique")),
            Map.entry("react", List.of("frontend", "web")),
            Map.entry("spring", List.of("backend", "java"))
    );

    private final ServiceRepository serviceRepository;
    private final ServiceImageRepository serviceImageRepository;

    @Transactional(readOnly = true)
    public List<RecommendationResultDto> recommendFreelancers(RecommendationRequestDto request) {
        RecommendationRequestDto safeRequest = request == null ? new RecommendationRequestDto() : request;
        int limit = resolveLimit(safeRequest.getLimit());

        return serviceRepository.findByStatus(ServiceStatus.PUBLISHED)
                .stream()
                .filter(service -> isCandidate(service, safeRequest))
                .map(service -> scoreService(service, safeRequest))
                .sorted(Comparator.comparing(RecommendationResultDto::getScore).reversed()
                        .thenComparing(result -> result.getService().getPrice()))
                .limit(limit)
                .toList();
    }

    private RecommendationResultDto scoreService(ServiceEntity service, RecommendationRequestDto request) {
        double adequacyScore = calculateAdequacyScore(service, request);
        double proximityScore = calculateProximityScore(service, request);
        double budgetScore = calculateBudgetScore(service, request);
        double availabilityScore = calculateAvailabilityScore(service, request);
        double ratingScore = calculateRatingScore(service);
        double experienceScore = calculateExperienceScore(service);
        double responseScore = calculateResponseScore(service);
        double trustScore = calculateTrustScore(service);

        double finalScore =
                0.25 * adequacyScore
                        + 0.20 * proximityScore
                        + 0.15 * budgetScore
                        + 0.10 * availabilityScore
                        + 0.10 * ratingScore
                        + 0.10 * experienceScore
                        + 0.05 * responseScore
                        + 0.05 * trustScore;

        Map<String, Double> details = new LinkedHashMap<>();
        details.put("adequacy", round(adequacyScore));
        details.put("proximity", round(proximityScore));
        details.put("budget", round(budgetScore));
        details.put("availability", round(availabilityScore));
        details.put("rating", round(ratingScore));
        details.put("experience", round(experienceScore));
        details.put("response", round(responseScore));
        details.put("trust", round(trustScore));

        return RecommendationResultDto.builder()
                .service(mapToServiceDto(service))
                .score(round(finalScore))
                .scoreDetails(details)
                .reasons(buildReasons(service, request, details))
                .build();
    }

    private boolean isCandidate(ServiceEntity service, RecommendationRequestDto request) {
        String requestedCategory = normalize(request.getCategoryName());
        if (request.getCategoryId() != null && !request.getCategoryId().equals(service.getCategory().getId())) {
            return false;
        }

        if (requestedCategory != null && !normalize(service.getCategory().getName()).contains(requestedCategory)) {
            return false;
        }

        String requestedMode = normalize(request.getMode());
        if (requestedMode != null && !normalize(resolveExecutionMode(service)).equals(requestedMode)) {
            return false;
        }

        String requestedCity = normalize(request.getCity());
        if (requestedCity == null) {
            return true;
        }

        return service.isRemote()
                || requestedCity.equals(normalize(service.getCity()))
                || requestedCity.equals(normalize(service.getFreelancer().getUser().getCity()));
    }

    private double calculateAdequacyScore(ServiceEntity service, RecommendationRequestDto request) {
        String requestText = joinText(request.getKeyword(), request.getDescription(), request.getCategoryName());
        String serviceText = joinText(
                service.getTitle(),
                service.getDescription(),
                service.getCategory().getName(),
                service.getFreelancer().getHeadline(),
                service.getFreelancer().getBio(),
                String.join(" ", service.getFreelancer().getSkills() == null ? List.of() : service.getFreelancer().getSkills())
        );

        double textSimilarity = calculateCosineSimilarity(requestText, serviceText);
        double categoryScore = calculateCategoryScore(service, request);
        double skillScore = calculateSkillScore(service, requestText);

        return clamp(0.55 * textSimilarity + 0.30 * categoryScore + 0.15 * skillScore);
    }

    private double calculateCategoryScore(ServiceEntity service, RecommendationRequestDto request) {
        if (request.getCategoryId() == null && normalize(request.getCategoryName()) == null) {
            return 0.65;
        }

        if (request.getCategoryId() != null && request.getCategoryId().equals(service.getCategory().getId())) {
            return 1.0;
        }

        String requestedCategory = normalize(request.getCategoryName());
        String serviceCategory = normalize(service.getCategory().getName());

        if (requestedCategory != null && serviceCategory != null && serviceCategory.contains(requestedCategory)) {
            return 1.0;
        }

        return 0.2;
    }

    private double calculateSkillScore(ServiceEntity service, String requestText) {
        List<String> requestTokens = tokenize(requestText);
        List<String> skillTokens = tokenize(joinText(
                service.getTitle(),
                service.getCategory().getName(),
                String.join(" ", service.getFreelancer().getSkills() == null ? List.of() : service.getFreelancer().getSkills())
        ));

        if (requestTokens.isEmpty()) {
            return 0.65;
        }

        Set<String> skills = new LinkedHashSet<>(skillTokens);
        long matchedTokens = requestTokens.stream().filter(skills::contains).count();
        return clamp((double) matchedTokens / requestTokens.size());
    }

    private double calculateProximityScore(ServiceEntity service, RecommendationRequestDto request) {
        String requestedCity = normalize(request.getCity());
        if (requestedCity == null) {
            return service.isRemote() ? 0.70 : 0.55;
        }

        String serviceCity = normalize(service.getCity());
        String freelancerCity = normalize(service.getFreelancer().getUser().getCity());

        if (requestedCity.equals(serviceCity)) {
            return 1.0;
        }

        if (requestedCity.equals(freelancerCity)) {
            return 0.9;
        }

        return service.isRemote() ? 0.6 : 0.15;
    }

    private double calculateBudgetScore(ServiceEntity service, RecommendationRequestDto request) {
        BigDecimal budget = request.getMaxBudget();
        if (budget == null || budget.compareTo(BigDecimal.ZERO) <= 0) {
            return 0.70;
        }

        BigDecimal price = service.getPrice() == null ? BigDecimal.ZERO : service.getPrice();
        double ratio = price.doubleValue() / budget.doubleValue();

        if (ratio <= 1.0) {
            return 1.0;
        }

        if (ratio <= 1.2) {
            return 0.75;
        }

        if (ratio <= 1.5) {
            return 0.45;
        }

        return 0.15;
    }

    private double calculateAvailabilityScore(ServiceEntity service, RecommendationRequestDto request) {
        Integer deliveryDays = service.getDeliveryTimeDays();
        if (deliveryDays == null) {
            return 0.45;
        }

        Integer requestedDays = request.getMaxDeliveryDays();
        if (requestedDays == null || requestedDays <= 0) {
            if (deliveryDays <= 2) {
                return 1.0;
            }
            if (deliveryDays <= 7) {
                return 0.82;
            }
            if (deliveryDays <= 14) {
                return 0.62;
            }
            return 0.38;
        }

        if (deliveryDays <= requestedDays) {
            return 1.0;
        }

        if (deliveryDays <= Math.ceil(requestedDays * 1.5)) {
            return 0.6;
        }

        return 0.25;
    }

    private double calculateRatingScore(ServiceEntity service) {
        BigDecimal averageRating = service.getFreelancer().getAverageRating();
        if (averageRating == null || averageRating.compareTo(BigDecimal.ZERO) <= 0) {
            return 0.60;
        }

        return clamp(averageRating.doubleValue() / 5.0);
    }

    private double calculateExperienceScore(ServiceEntity service) {
        Integer completedOrders = service.getFreelancer().getCompletedOrders();
        if (completedOrders == null || completedOrders <= 0) {
            return 0.30;
        }

        return clamp(completedOrders / 20.0);
    }

    private double calculateResponseScore(ServiceEntity service) {
        Integer deliveryDays = service.getDeliveryTimeDays();
        if (deliveryDays == null) {
            return 0.45;
        }

        if (deliveryDays <= 1) {
            return 1.0;
        }
        if (deliveryDays <= 3) {
            return 0.85;
        }
        if (deliveryDays <= 7) {
            return 0.65;
        }
        if (deliveryDays <= 14) {
            return 0.45;
        }
        return 0.25;
    }

    private double calculateTrustScore(ServiceEntity service) {
        FreelancerProfile profile = service.getFreelancer();
        int availableSignals = 0;

        if (hasText(profile.getHeadline())) {
            availableSignals += 1;
        }
        if (hasText(profile.getBio())) {
            availableSignals += 1;
        }
        if (profile.getSkills() != null && !profile.getSkills().isEmpty()) {
            availableSignals += 1;
        }
        if (hasText(profile.getPortfolioUrl())) {
            availableSignals += 1;
        }
        if (profile.getTotalReviews() != null && profile.getTotalReviews() > 0) {
            availableSignals += 1;
        }
        if (profile.getCompletedOrders() != null && profile.getCompletedOrders() > 0) {
            availableSignals += 1;
        }

        return availableSignals / 6.0;
    }

    private List<String> buildReasons(ServiceEntity service, RecommendationRequestDto request, Map<String, Double> details) {
        List<String> reasons = new ArrayList<>();

        if (details.get("proximity") >= 0.9) {
            reasons.add("Meme ville ou profil local");
        } else if (service.isRemote()) {
            reasons.add("Disponible a distance");
        }

        if (details.get("adequacy") >= 0.65) {
            reasons.add("Competences adaptees au besoin");
        }

        if (details.get("budget") >= 0.95 && request.getMaxBudget() != null) {
            reasons.add("Budget compatible");
        }

        if (details.get("availability") >= 0.9) {
            reasons.add("Delai compatible");
        }

        if (details.get("rating") >= 0.9) {
            reasons.add("Tres bien note");
        }

        if (details.get("experience") >= 0.5) {
            reasons.add("Experience confirmee");
        }

        if (details.get("trust") >= 0.65) {
            reasons.add("Profil bien renseigne");
        }

        if (reasons.isEmpty()) {
            reasons.add("Bon equilibre entre budget, delai et profil");
        }

        return reasons.stream().limit(4).toList();
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
                .serviceCity(service.getCity())
                .remote(service.isRemote())
                .deliveryTimeDays(service.getDeliveryTimeDays())
                .coverImageUrl(service.getCoverImageUrl())
                .galleryImageUrls(getGalleryImageUrls(service.getId()))
                .executionMode(resolveExecutionMode(service))
                .status("ACTIVE")
                .build();
    }

    private List<String> getGalleryImageUrls(Long serviceId) {
        if (serviceId == null) {
            return List.of();
        }

        List<ServiceImage> images = serviceImageRepository.findByServiceIdOrderBySortOrderAsc(serviceId);
        if (images == null) {
            return List.of();
        }

        return images.stream()
                .map(ServiceImage::getImageUrl)
                .collect(Collectors.toList());
    }

    private double calculateCosineSimilarity(String requestText, String serviceText) {
        List<String> requestTokens = tokenize(requestText);
        if (requestTokens.isEmpty()) {
            return 0.65;
        }

        List<String> serviceTokens = tokenize(serviceText);
        if (serviceTokens.isEmpty()) {
            return 0;
        }

        Map<String, Long> requestVector = toVector(requestTokens);
        Map<String, Long> serviceVector = toVector(serviceTokens);

        double dotProduct = requestVector.entrySet().stream()
                .mapToDouble(entry -> entry.getValue() * serviceVector.getOrDefault(entry.getKey(), 0L))
                .sum();

        double requestNorm = Math.sqrt(requestVector.values().stream()
                .mapToDouble(value -> value * value)
                .sum());
        double serviceNorm = Math.sqrt(serviceVector.values().stream()
                .mapToDouble(value -> value * value)
                .sum());

        if (requestNorm == 0 || serviceNorm == 0) {
            return 0;
        }

        return clamp(dotProduct / (requestNorm * serviceNorm));
    }

    private Map<String, Long> toVector(List<String> tokens) {
        Map<String, Long> vector = new HashMap<>();
        tokens.forEach(token -> vector.merge(token, 1L, Long::sum));
        return vector;
    }

    private List<String> tokenize(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return List.of();
        }

        return Arrays.stream(normalized.replaceAll("[^a-z0-9]+", " ").split("\\s+"))
                .filter(token -> token.length() >= 3)
                .map(this::stem)
                .filter(token -> !STOP_WORDS.contains(token))
                .flatMap(token -> Stream.concat(Stream.of(token), TOKEN_ALIASES.getOrDefault(token, List.of()).stream()))
                .toList();
    }

    private String stem(String token) {
        if (token.length() > 5 && token.endsWith("es")) {
            return token.substring(0, token.length() - 2);
        }
        if (token.length() > 4 && token.endsWith("s")) {
            return token.substring(0, token.length() - 1);
        }
        return token;
    }

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

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        String withoutAccents = DIACRITICS.matcher(Normalizer.normalize(trimmed, Normalizer.Form.NFD)).replaceAll("");
        return withoutAccents.toLowerCase(Locale.ROOT);
    }

    private String joinText(String... values) {
        return Arrays.stream(values)
                .filter(this::hasText)
                .collect(Collectors.joining(" "));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private int resolveLimit(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit <= 0) {
            return DEFAULT_LIMIT;
        }

        return Math.min(requestedLimit, MAX_LIMIT);
    }

    private double clamp(double value) {
        return Math.max(0, Math.min(1, value));
    }

    private double round(double value) {
        return Math.round(clamp(value) * 100.0) / 100.0;
    }
}

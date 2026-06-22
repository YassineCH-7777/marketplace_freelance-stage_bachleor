package com.marketplace.service;

import com.marketplace.enums.ServiceStatus;
import com.marketplace.model.FreelancerProfile;
import com.marketplace.model.ServiceEntity;
import com.marketplace.model.ServiceImage;
import com.marketplace.persistence.ServiceImageRepository;
import com.marketplace.persistence.ServiceRepository;
import com.marketplace.dto.recommendation.MatchingAssistantRequestDto;
import com.marketplace.dto.recommendation.MatchingAssistantResponseDto;
import com.marketplace.dto.recommendation.RecommendationRequestDto;
import com.marketplace.dto.recommendation.RecommendationResultDto;
import com.marketplace.dto.service.ServiceDto;
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
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final int DEFAULT_LIMIT = 8;
    private static final int MAX_LIMIT = 30;
    private static final int DEFAULT_RADIUS_KM = 10;
    private static final int MAX_RADIUS_KM = 50;
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern MONEY_PATTERN = Pattern.compile(
            "(?:(?:budget|max|maximum|prix|tarif)\\s*(?:de|:|a)?\\s*(\\d{2,7})|\\b(\\d{2,7})\\s*(?:mad|dh|dhs|dirhams?))"
    );
    private static final Pattern DAYS_PATTERN = Pattern.compile("(\\d{1,3})\\s*(?:j|jour|jours|day|days)");
    private static final Pattern WEEKS_PATTERN = Pattern.compile("(\\d{1,2})\\s*(?:semaine|semaines|week|weeks)");

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

    private static final Map<String, String> CATEGORY_HINTS = Map.ofEntries(
            Map.entry("site", "Developpement web"),
            Map.entry("web", "Developpement web"),
            Map.entry("developpement", "Developpement web"),
            Map.entry("application", "Developpement web"),
            Map.entry("app", "Developpement web"),
            Map.entry("landing", "Developpement web"),
            Map.entry("seo", "Developpement web"),
            Map.entry("logo", "Design graphique"),
            Map.entry("identite", "Design graphique"),
            Map.entry("charte", "Design graphique"),
            Map.entry("design", "Design graphique"),
            Map.entry("photo", "Photographie"),
            Map.entry("photographie", "Photographie"),
            Map.entry("shooting", "Photographie"),
            Map.entry("retouche", "Photographie"),
            Map.entry("video", "Montage video"),
            Map.entry("reel", "Montage video"),
            Map.entry("montage", "Montage video"),
            Map.entry("reseau", "Support informatique"),
            Map.entry("wifi", "Support informatique"),
            Map.entry("informatique", "Support informatique"),
            Map.entry("depannage", "Support informatique"),
            Map.entry("community", "Community management"),
            Map.entry("instagram", "Community management"),
            Map.entry("social", "Community management"),
            Map.entry("cours", "Cours particuliers"),
            Map.entry("formation", "Cours particuliers"),
            Map.entry("redaction", "Redaction"),
            Map.entry("texte", "Redaction")
    );

    private final ServiceRepository serviceRepository;
    private final ServiceImageRepository serviceImageRepository;

    /**
     * Classe les services publies selon adequation, proximite, budget, delai et signaux de confiance.
     */
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

    /**
     * Interprete un besoin en langage naturel puis renvoie les recommandations correspondantes.
     */
    @Transactional(readOnly = true)
    public MatchingAssistantResponseDto matchClientNeed(MatchingAssistantRequestDto request) {
        MatchingAssistantRequestDto safeRequest = request == null ? new MatchingAssistantRequestDto() : request;
        String need = normalizeOptionalText(safeRequest.getNeed());
        RecommendationRequestDto interpretedRequest = interpretClientNeed(safeRequest, need);
        List<RecommendationResultDto> recommendations = recommendFreelancers(interpretedRequest);
        List<String> extractedKeywords = tokenize(need).stream()
                .distinct()
                .limit(8)
                .toList();

        return MatchingAssistantResponseDto.builder()
                .summary(buildMatchingSummary(interpretedRequest, recommendations))
                .interpretedRequest(interpretedRequest)
                .extractedKeywords(extractedKeywords)
                .recommendations(recommendations)
                .build();
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

        String requestedMode = normalizeMode(request.getMode());
        if (requestedMode != null && !normalizeMode(resolveExecutionMode(service)).equals(requestedMode)) {
            return false;
        }

        String requestedCity = normalize(request.getCity());
        if (hasCoordinates(request.getLatitude(), request.getLongitude())
                && hasCoordinates(service.getLatitude(), service.getLongitude())) {
            double distanceKm = calculateDistanceKm(
                    request.getLatitude(),
                    request.getLongitude(),
                    service.getLatitude(),
                    service.getLongitude()
            );
            int requestedRadius = resolveRadiusKm(request.getRadiusKm(), DEFAULT_RADIUS_KM);
            int serviceRadius = resolveRadiusKm(service.getServiceRadiusKm(), requestedRadius);

            if (distanceKm <= Math.min(requestedRadius, serviceRadius) || service.isRemote()) {
                return true;
            }
        }

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
        if (hasCoordinates(request.getLatitude(), request.getLongitude())
                && hasCoordinates(service.getLatitude(), service.getLongitude())) {
            double distanceKm = calculateDistanceKm(
                    request.getLatitude(),
                    request.getLongitude(),
                    service.getLatitude(),
                    service.getLongitude()
            );
            int requestedRadius = resolveRadiusKm(request.getRadiusKm(), DEFAULT_RADIUS_KM);
            int serviceRadius = resolveRadiusKm(service.getServiceRadiusKm(), requestedRadius);
            int effectiveRadius = Math.min(requestedRadius, serviceRadius);

            if (distanceKm <= Math.max(1, effectiveRadius * 0.25)) {
                return 1.0;
            }

            if (distanceKm <= effectiveRadius) {
                return clamp(1.0 - ((distanceKm / effectiveRadius) * 0.45));
            }

            return service.isRemote() ? 0.58 : 0.12;
        }

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

    private boolean hasCoordinates(Double latitude, Double longitude) {
        return latitude != null
                && longitude != null
                && latitude >= -90
                && latitude <= 90
                && longitude >= -180
                && longitude <= 180;
    }

    private int resolveRadiusKm(Integer radiusKm, int fallbackRadiusKm) {
        if (radiusKm == null || radiusKm < 1 || radiusKm > MAX_RADIUS_KM) {
            return fallbackRadiusKm;
        }

        return radiusKm;
    }

    private double calculateDistanceKm(Double fromLatitude, Double fromLongitude, Double toLatitude, Double toLongitude) {
        double earthRadiusKm = 6371.0;
        double deltaLat = Math.toRadians(toLatitude - fromLatitude);
        double deltaLng = Math.toRadians(toLongitude - fromLongitude);
        double fromLat = Math.toRadians(fromLatitude);
        double toLat = Math.toRadians(toLatitude);

        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
                .latitude(service.getLatitude())
                .longitude(service.getLongitude())
                .serviceRadiusKm(service.getServiceRadiusKm())
                .deliveryTimeDays(service.getDeliveryTimeDays())
                .coverImageUrl(service.getCoverImageUrl())
                .galleryImageUrls(getGalleryImageUrls(service.getId()))
                .executionMode(resolveExecutionMode(service))
                .status("ACTIVE")
                .build();
    }

    private RecommendationRequestDto interpretClientNeed(MatchingAssistantRequestDto request, String need) {
        String city = firstText(request.getCity(), inferCity(need));
        BigDecimal maxBudget = request.getMaxBudget() != null ? request.getMaxBudget() : inferBudget(need);
        Integer maxDeliveryDays = request.getMaxDeliveryDays() != null ? request.getMaxDeliveryDays() : inferDeliveryDays(need);
        String categoryName = inferCategoryName(need);

        return RecommendationRequestDto.builder()
                .keyword(need)
                .description(need)
                .categoryName(categoryName)
                .city(city)
                .mode(inferMode(need))
                .maxBudget(maxBudget)
                .maxDeliveryDays(maxDeliveryDays)
                .limit(resolveLimit(request.getLimit()))
                .build();
    }

    private String buildMatchingSummary(RecommendationRequestDto request, List<RecommendationResultDto> recommendations) {
        if (recommendations.isEmpty()) {
            return "Aucun profil exact n'a ete trouve. Elargissez la ville, le budget ou le delai.";
        }

        List<String> signals = new ArrayList<>();
        if (hasText(request.getCategoryName())) {
            signals.add(request.getCategoryName());
        }
        if (hasText(request.getCity())) {
            signals.add(request.getCity());
        }
        if (request.getMaxBudget() != null) {
            signals.add("budget " + request.getMaxBudget().stripTrailingZeros().toPlainString() + " MAD");
        }
        if (request.getMaxDeliveryDays() != null) {
            signals.add("delai " + request.getMaxDeliveryDays() + " jours");
        }

        String context = signals.isEmpty() ? "votre besoin" : String.join(", ", signals);
        return recommendations.size() + " profil(s) recommande(s) pour " + context + ".";
    }

    private String inferCategoryName(String need) {
        List<String> tokens = tokenize(need);
        return tokens.stream()
                .map(CATEGORY_HINTS::get)
                .filter(this::hasText)
                .findFirst()
                .orElse(null);
    }

    private String inferCity(String need) {
        String normalizedNeed = normalize(need);
        if (normalizedNeed == null) {
            return null;
        }

        return serviceRepository.findByStatus(ServiceStatus.PUBLISHED)
                .stream()
                .flatMap(service -> Stream.of(service.getCity(), service.getFreelancer().getUser().getCity()))
                .filter(this::hasText)
                .distinct()
                .filter(city -> normalizedNeed.contains(normalize(city)))
                .findFirst()
                .orElse(null);
    }

    private BigDecimal inferBudget(String need) {
        String normalizedNeed = normalize(need);
        if (normalizedNeed == null) {
            return null;
        }

        Matcher matcher = MONEY_PATTERN.matcher(normalizedNeed);
        BigDecimal bestCandidate = null;
        while (matcher.find()) {
            String rawValue = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
            BigDecimal candidate = new BigDecimal(rawValue);
            if (candidate.compareTo(new BigDecimal("50")) >= 0) {
                bestCandidate = candidate;
            }
        }
        return bestCandidate;
    }

    private Integer inferDeliveryDays(String need) {
        String normalizedNeed = normalize(need);
        if (normalizedNeed == null) {
            return null;
        }

        Optional<Integer> days = firstInteger(DAYS_PATTERN, normalizedNeed);
        if (days.isPresent()) {
            return days.get();
        }

        return firstInteger(WEEKS_PATTERN, normalizedNeed)
                .map(value -> value * 7)
                .orElse(null);
    }

    private Optional<Integer> firstInteger(Pattern pattern, String value) {
        Matcher matcher = pattern.matcher(value);
        if (!matcher.find()) {
            return Optional.empty();
        }

        try {
            return Optional.of(Integer.parseInt(matcher.group(1)));
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    private String inferMode(String need) {
        String normalizedNeed = normalize(need);
        if (normalizedNeed == null) {
            return null;
        }

        if (normalizedNeed.contains("sur place")
                || normalizedNeed.contains("a domicile")
                || normalizedNeed.contains("local")) {
            return "ON_SITE";
        }

        if (normalizedNeed.contains("a distance")
                || normalizedNeed.contains("remote")
                || normalizedNeed.contains("visio")) {
            return "REMOTE";
        }

        if (normalizedNeed.contains("hybride") || normalizedNeed.contains("hybrid")) {
            return "HYBRID";
        }

        return null;
    }

    private String firstText(String primary, String fallback) {
        return hasText(primary) ? primary.trim() : fallback;
    }

    private String normalizeOptionalText(String value) {
        return hasText(value) ? value.trim() : "";
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

    private String normalizeMode(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return null;
        }

        return switch (normalized) {
            case "local", "on_site", "onsite", "sur place", "domicile" -> "on_site";
            case "remote", "a distance", "distance", "visio" -> "remote";
            case "hybride", "hybrid" -> "hybrid";
            default -> normalized;
        };
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

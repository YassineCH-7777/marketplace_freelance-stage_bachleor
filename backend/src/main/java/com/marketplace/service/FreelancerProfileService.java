package com.marketplace.service;

import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.model.FreelancerProfile;
import com.marketplace.model.User;
import com.marketplace.enums.UserRole;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.persistence.FreelancerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FreelancerProfileService {

    private static final java.util.Set<Integer> SEARCH_RADIUS_OPTIONS = java.util.Set.of(5, 10, 20, 50);

    private final FreelancerProfileRepository profileRepository;

    /**
     * Charge le profil professionnel du freelance connecte.
     */
    @Transactional(readOnly = true)
    public FreelancerProfileDto getProfile(Long userId) {
        return mapToDto(getFreelancerProfile(userId));
    }

    /**
     * Met a jour le profil freelance, ses competences et ses donnees locales.
     */
    @Transactional
    public FreelancerProfileDto updateProfile(Long userId, FreelancerProfileDto dto) {
        FreelancerProfile profile = getFreelancerProfile(userId);
        User user = profile.getUser();

        user.setFirstName(normalizeRequired(dto.getFirstName(), "Le prenom est obligatoire."));
        user.setLastName(normalizeRequired(dto.getLastName(), "Le nom est obligatoire."));
        user.setPhone(normalizeOptional(dto.getPhone()));
        user.setCity(normalizeOptional(dto.getCity()));
        user.setSearchCity(normalizeOptional(dto.getSearchCity()));
        user.setSearchPlaceId(normalizeOptional(dto.getSearchPlaceId()));
        user.setSearchLatitude(normalizeLatitude(dto.getSearchLatitude()));
        user.setSearchLongitude(normalizeLongitude(dto.getSearchLongitude()));
        user.setSearchRadiusKm(normalizeSearchRadius(dto.getSearchRadiusKm()));
        profile.setHeadline(normalizeOptional(dto.getHeadline()));
        profile.setBio(normalizeOptional(dto.getBio()));
        profile.setPortfolioUrl(normalizeOptional(dto.getPortfolioUrl()));
        profile.setSkills(parseSkills(dto.getSkills()));

        return mapToDto(profileRepository.save(profile));
    }

    private FreelancerProfile getFreelancerProfile(Long userId) {
        FreelancerProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));

        if (profile.getUser().getRole() != UserRole.FREELANCER) {
            throw new BusinessException("Ce profil est reserve aux freelances.", HttpStatus.FORBIDDEN);
        }

        return profile;
    }

    private String normalizeRequired(String value, String errorMessage) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 2) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private List<String> parseSkills(String rawSkills) {
        if (rawSkills == null || rawSkills.isBlank()) {
            return List.of();
        }
        return Arrays.stream(rawSkills.split(","))
                .map(String::trim)
                .filter(skill -> !skill.isBlank())
                .collect(Collectors.toList());
    }

    private FreelancerProfileDto mapToDto(FreelancerProfile profile) {
        User user = profile.getUser();
        return FreelancerProfileDto.builder()
                .id(profile.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .headline(profile.getHeadline())
                .city(user.getCity())
                .searchCity(user.getSearchCity())
                .searchPlaceId(user.getSearchPlaceId())
                .searchLatitude(user.getSearchLatitude())
                .searchLongitude(user.getSearchLongitude())
                .searchRadiusKm(resolveSearchRadius(user.getSearchRadiusKm()))
                .bio(profile.getBio())
                .portfolioUrl(profile.getPortfolioUrl())
                .skills(joinSkills(profile.getSkills()))
                .build();
    }

    private String joinSkills(List<String> skills) {
        if (skills == null || skills.isEmpty()) {
            return "";
        }
        return String.join(", ", skills);
    }

    private Integer normalizeSearchRadius(Integer radiusKm) {
        if (radiusKm == null) {
            return 10;
        }

        if (!SEARCH_RADIUS_OPTIONS.contains(radiusKm)) {
            throw new BusinessException("Le rayon doit etre 5, 10, 20 ou 50 km.", HttpStatus.BAD_REQUEST);
        }

        return radiusKm;
    }

    private Integer resolveSearchRadius(Integer radiusKm) {
        return radiusKm != null && SEARCH_RADIUS_OPTIONS.contains(radiusKm) ? radiusKm : 10;
    }

    private Double normalizeLatitude(Double value) {
        return normalizeCoordinate(value, -90, 90, "La latitude de recherche est invalide.");
    }

    private Double normalizeLongitude(Double value) {
        return normalizeCoordinate(value, -180, 180, "La longitude de recherche est invalide.");
    }

    private Double normalizeCoordinate(Double value, double min, double max, String errorMessage) {
        if (value == null) {
            return null;
        }

        if (value < min || value > max) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }

        return value;
    }
}

package com.marketplace.service;

import com.marketplace.dto.user.UserDto;
import com.marketplace.model.User;
import com.marketplace.enums.UserRole;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.persistence.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClientProfileService {

    private static final java.util.Set<Integer> SEARCH_RADIUS_OPTIONS = java.util.Set.of(5, 10, 20, 50);

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserDto getProfile(Long userId) {
        User user = getClientUser(userId);
        return mapToDto(user);
    }

    @Transactional
    public UserDto updateProfile(Long userId, UserDto dto) {
        User user = getClientUser(userId);

        user.setFirstName(normalizeRequired(dto.getFirstName(), "Le prenom est obligatoire."));
        user.setLastName(normalizeRequired(dto.getLastName(), "Le nom est obligatoire."));
        user.setPhone(normalizeOptional(dto.getPhone()));
        user.setCity(normalizeOptional(dto.getCity()));
        user.setSearchCity(normalizeOptional(dto.getSearchCity()));
        user.setSearchPlaceId(normalizeOptional(dto.getSearchPlaceId()));
        user.setSearchLatitude(normalizeLatitude(dto.getSearchLatitude()));
        user.setSearchLongitude(normalizeLongitude(dto.getSearchLongitude()));
        user.setSearchRadiusKm(normalizeSearchRadius(dto.getSearchRadiusKm()));

        return mapToDto(userRepository.save(user));
    }

    private User getClientUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));

        if (user.getRole() != UserRole.CLIENT) {
            throw new BusinessException("Ce profil est reserve aux clients.", HttpStatus.FORBIDDEN);
        }

        return user;
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

    private UserDto mapToDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .city(user.getCity())
                .searchCity(user.getSearchCity())
                .searchPlaceId(user.getSearchPlaceId())
                .searchLatitude(user.getSearchLatitude())
                .searchLongitude(user.getSearchLongitude())
                .searchRadiusKm(resolveSearchRadius(user.getSearchRadiusKm()))
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
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

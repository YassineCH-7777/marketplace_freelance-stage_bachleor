package com.marketplace.service;

import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.User;
import com.marketplace.enums.UserRole;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.repository.FreelancerProfileRepository;
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

    private final FreelancerProfileRepository profileRepository;

    @Transactional(readOnly = true)
    public FreelancerProfileDto getProfile(Long userId) {
        return mapToDto(getFreelancerProfile(userId));
    }

    @Transactional
    public FreelancerProfileDto updateProfile(Long userId, FreelancerProfileDto dto) {
        FreelancerProfile profile = getFreelancerProfile(userId);
        User user = profile.getUser();

        user.setFirstName(normalizeRequired(dto.getFirstName(), "Le prenom est obligatoire."));
        user.setLastName(normalizeRequired(dto.getLastName(), "Le nom est obligatoire."));
        user.setPhone(normalizeOptional(dto.getPhone()));
        user.setCity(normalizeOptional(dto.getCity()));
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
}

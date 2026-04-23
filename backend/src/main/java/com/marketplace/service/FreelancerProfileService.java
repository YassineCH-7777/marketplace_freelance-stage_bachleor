package com.marketplace.service;

import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.repository.FreelancerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FreelancerProfileService {

    private final FreelancerProfileRepository profileRepository;

    @Transactional
    public FreelancerProfileDto updateProfile(Long userId, FreelancerProfileDto dto) {
        FreelancerProfile profile = profileRepository.findByUserId(userId).orElseThrow();
        profile.setBio(dto.getBio());
        profile.setPortfolioUrl(dto.getPortfolioUrl());
        profile.setSkills(parseSkills(dto.getSkills()));
        profile.getUser().setCity(dto.getCity());
        profile = profileRepository.save(profile);

        return FreelancerProfileDto.builder()
                .id(profile.getId())
                .city(profile.getUser().getCity())
                .bio(profile.getBio())
                .portfolioUrl(profile.getPortfolioUrl())
                .skills(String.join(",", profile.getSkills()))
                .build();
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
}

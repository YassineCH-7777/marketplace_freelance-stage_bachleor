package com.marketplace.service;

import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.repository.FreelancerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FreelancerProfileService {

    private final FreelancerProfileRepository profileRepository;

    @Transactional
    public FreelancerProfileDto updateProfile(Long userId, FreelancerProfileDto dto) {
        FreelancerProfile profile = profileRepository.findByUserId(userId).orElseThrow();
    profile.setBio(dto.getBio());
    profile.setPortfolioUrl(dto.getPortfolioUrl());
    profile.setSkills(dto.getSkills());
    // city is stored on User
    profile.getUser().setCity(dto.getCity());
        profile = profileRepository.save(profile);
        
        return FreelancerProfileDto.builder()
                .id(profile.getId())
                .city(profile.getUser().getCity())
                .bio(profile.getBio())
                .portfolioUrl(profile.getPortfolioUrl())
                .skills(profile.getSkills())
                .build();
    }
}

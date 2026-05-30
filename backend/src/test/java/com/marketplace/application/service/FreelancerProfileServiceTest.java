package com.marketplace.application.service;

import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.model.FreelancerProfile;
import com.marketplace.model.User;
import com.marketplace.enums.UserRole;
import com.marketplace.exception.BusinessException;
import com.marketplace.persistence.FreelancerProfileRepository;
import com.marketplace.service.FreelancerProfileService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FreelancerProfileServiceTest {

    @Mock
    private FreelancerProfileRepository profileRepository;

    @InjectMocks
    private FreelancerProfileService freelancerProfileService;

    @Test
    void getProfileLoadsPersonalAndProfessionalDataFromDatabase() {
        FreelancerProfile profile = buildProfile();

        when(profileRepository.findByUserId(12L)).thenReturn(Optional.of(profile));

        FreelancerProfileDto result = freelancerProfileService.getProfile(12L);

        assertThat(result.getFirstName()).isEqualTo("Yassine");
        assertThat(result.getLastName()).isEqualTo("Alaoui");
        assertThat(result.getPhone()).isEqualTo("0612345678");
        assertThat(result.getCity()).isEqualTo("Casablanca");
        assertThat(result.getHeadline()).isEqualTo("Developpeur fullstack");
        assertThat(result.getBio()).isEqualTo("Je construis des applications web.");
        assertThat(result.getSkills()).isEqualTo("Java, React");
    }

    @Test
    void updateProfileUpdatesUserAndFreelancerFields() {
        FreelancerProfile profile = buildProfile();
        FreelancerProfileDto request = FreelancerProfileDto.builder()
                .firstName("Sara")
                .lastName("Bennani")
                .phone("0600000000")
                .city("Rabat")
                .headline("UI UX Designer")
                .bio("Design de produits web.")
                .portfolioUrl("https://portfolio.test")
                .skills("Figma, UX, Branding")
                .build();

        when(profileRepository.findByUserId(12L)).thenReturn(Optional.of(profile));
        when(profileRepository.save(profile)).thenReturn(profile);

        FreelancerProfileDto result = freelancerProfileService.updateProfile(12L, request);

        assertThat(profile.getUser().getFirstName()).isEqualTo("Sara");
        assertThat(profile.getUser().getLastName()).isEqualTo("Bennani");
        assertThat(profile.getUser().getPhone()).isEqualTo("0600000000");
        assertThat(profile.getUser().getCity()).isEqualTo("Rabat");
        assertThat(profile.getHeadline()).isEqualTo("UI UX Designer");
        assertThat(profile.getBio()).isEqualTo("Design de produits web.");
        assertThat(profile.getPortfolioUrl()).isEqualTo("https://portfolio.test");
        assertThat(profile.getSkills()).containsExactly("Figma", "UX", "Branding");
        assertThat(result.getSkills()).isEqualTo("Figma, UX, Branding");
    }

    @Test
    void updateProfileRejectsInvalidName() {
        FreelancerProfile profile = buildProfile();
        FreelancerProfileDto request = FreelancerProfileDto.builder()
                .firstName("A")
                .lastName("Bennani")
                .build();

        when(profileRepository.findByUserId(12L)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> freelancerProfileService.updateProfile(12L, request))
                .isInstanceOf(BusinessException.class);
    }

    private FreelancerProfile buildProfile() {
        User user = User.builder()
                .id(12L)
                .email("freelancer@marketplace.com")
                .firstName("Yassine")
                .lastName("Alaoui")
                .phone("0612345678")
                .city("Casablanca")
                .role(UserRole.FREELANCER)
                .build();

        return FreelancerProfile.builder()
                .id(22L)
                .user(user)
                .headline("Developpeur fullstack")
                .bio("Je construis des applications web.")
                .portfolioUrl("https://old.test")
                .skills(new ArrayList<>(java.util.List.of("Java", "React")))
                .build();
    }
}

package com.marketplace.application.service;

import com.marketplace.domain.enums.ServiceStatus;
import com.marketplace.domain.enums.UserRole;
import com.marketplace.domain.enums.UserStatus;
import com.marketplace.domain.model.Category;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.ServiceEntity;
import com.marketplace.domain.model.User;
import com.marketplace.infrastructure.persistence.ServiceImageRepository;
import com.marketplace.infrastructure.persistence.ServiceRepository;
import com.marketplace.web.dto.recommendation.MatchingAssistantRequestDto;
import com.marketplace.web.dto.recommendation.MatchingAssistantResponseDto;
import com.marketplace.web.dto.recommendation.RecommendationRequestDto;
import com.marketplace.web.dto.recommendation.RecommendationResultDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock
    private ServiceRepository serviceRepository;

    @Mock
    private ServiceImageRepository serviceImageRepository;

    @InjectMocks
    private RecommendationService recommendationService;

    @Test
    void recommendFreelancersRanksLocalRelevantServiceFirst() {
        Category webCategory = category(2L, "Developpement web");
        ServiceEntity localReactService = service(
                10L,
                "Site vitrine React pour restaurant",
                "Creation de site web moderne avec menu, reservation et SEO local.",
                new BigDecimal("1800.00"),
                8,
                "Marrakech",
                true,
                webCategory,
                freelancer(21L, 31L, "Marrakech", List.of("React", "Spring Boot", "SEO"), "Developpeur web React")
        );
        ServiceEntity remoteGenericService = service(
                11L,
                "Application web generaliste",
                "Developpement d'applications web et maintenance technique.",
                new BigDecimal("3200.00"),
                20,
                "Remote",
                true,
                webCategory,
                freelancer(22L, 32L, "Rabat", List.of("Java", "Maintenance"), "Developpeur generaliste")
        );
        RecommendationRequestDto request = RecommendationRequestDto.builder()
                .keyword("site vitrine restaurant React")
                .categoryName("Developpement web")
                .city("Marrakech")
                .maxBudget(new BigDecimal("2000.00"))
                .maxDeliveryDays(10)
                .limit(5)
                .build();

        when(serviceRepository.findByStatus(ServiceStatus.PUBLISHED)).thenReturn(List.of(remoteGenericService, localReactService));
        when(serviceImageRepository.findByServiceIdOrderBySortOrderAsc(anyLong())).thenReturn(List.of());

        List<RecommendationResultDto> results = recommendationService.recommendFreelancers(request);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getService().getId()).isEqualTo(10L);
        assertThat(results.get(0).getScore()).isGreaterThan(results.get(1).getScore());
        assertThat(results.get(0).getReasons()).contains("Meme ville ou profil local", "Budget compatible");
        assertThat(results.get(0).getScoreDetails()).containsKeys("adequacy", "proximity", "budget", "rating");
    }

    @Test
    void matchClientNeedInterpretsTextAndReturnsRecommendations() {
        Category webCategory = category(2L, "Developpement web");
        ServiceEntity localReactService = service(
                10L,
                "Site vitrine React pour restaurant",
                "Creation de site web moderne avec menu, reservation et SEO local.",
                new BigDecimal("1800.00"),
                8,
                "Marrakech",
                true,
                webCategory,
                freelancer(21L, 31L, "Marrakech", List.of("React", "Spring Boot", "SEO"), "Developpeur web React")
        );
        ServiceEntity expensiveService = service(
                11L,
                "Application web sur mesure",
                "Application web complete pour processus internes.",
                new BigDecimal("5000.00"),
                25,
                "Rabat",
                true,
                webCategory,
                freelancer(22L, 32L, "Rabat", List.of("Java", "React"), "Developpeur fullstack")
        );

        when(serviceRepository.findByStatus(ServiceStatus.PUBLISHED)).thenReturn(List.of(expensiveService, localReactService));
        when(serviceImageRepository.findByServiceIdOrderBySortOrderAsc(anyLong())).thenReturn(List.of());

        MatchingAssistantResponseDto response = recommendationService.matchClientNeed(
                MatchingAssistantRequestDto.builder()
                        .need("Je cherche un site web pour mon restaurant a Marrakech, budget 2000 MAD, livraison en 10 jours.")
                        .limit(3)
                        .build());

        assertThat(response.getInterpretedRequest().getCategoryName()).isEqualTo("Developpement web");
        assertThat(response.getInterpretedRequest().getCity()).isEqualTo("Marrakech");
        assertThat(response.getInterpretedRequest().getMaxBudget()).isEqualByComparingTo("2000");
        assertThat(response.getInterpretedRequest().getMaxDeliveryDays()).isEqualTo(10);
        assertThat(response.getRecommendations()).hasSize(2);
        assertThat(response.getRecommendations().get(0).getService().getId()).isEqualTo(10L);
        assertThat(response.getSummary()).contains("profil");
    }

    private ServiceEntity service(
            Long id,
            String title,
            String description,
            BigDecimal price,
            Integer deliveryDays,
            String city,
            boolean remote,
            Category category,
            FreelancerProfile freelancer
    ) {
        return ServiceEntity.builder()
                .id(id)
                .title(title)
                .slug("service-" + id)
                .description(description)
                .price(price)
                .deliveryTimeDays(deliveryDays)
                .city(city)
                .remote(remote)
                .status(ServiceStatus.PUBLISHED)
                .category(category)
                .freelancer(freelancer)
                .build();
    }

    private FreelancerProfile freelancer(
            Long profileId,
            Long userId,
            String city,
            List<String> skills,
            String headline
    ) {
        User user = User.builder()
                .id(userId)
                .email("freelancer" + userId + "@marketplace.com")
                .password("hashed")
                .firstName("Free")
                .lastName("Lancer")
                .city(city)
                .role(UserRole.FREELANCER)
                .status(UserStatus.ACTIVE)
                .build();

        return FreelancerProfile.builder()
                .id(profileId)
                .user(user)
                .headline(headline)
                .bio("Profil specialise dans les missions locales pour petites entreprises.")
                .portfolioUrl("https://portfolio.test")
                .skills(skills)
                .averageRating(new BigDecimal("4.8"))
                .totalReviews(12)
                .completedOrders(15)
                .build();
    }

    private Category category(Long id, String name) {
        return Category.builder()
                .id(id)
                .name(name)
                .slug("developpement-web")
                .isActive(true)
                .build();
    }
}

package com.marketplace.web.dto.favorite;

import com.marketplace.domain.model.ClientFavorite;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.ServiceEntity;
import com.marketplace.domain.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FavoriteDto {
    private Long id;
    private String type;
    private Long serviceId;
    private String serviceTitle;
    private String serviceCategoryName;
    private BigDecimal servicePrice;
    private String serviceCity;
    private String serviceCoverImageUrl;
    private Long freelancerId;
    private String freelancerEmail;
    private String freelancerFirstName;
    private String freelancerLastName;
    private String freelancerCity;
    private String freelancerHeadline;
    private BigDecimal freelancerRating;
    private Integer freelancerTotalReviews;
    private LocalDateTime createdAt;

    public static FavoriteDto from(ClientFavorite favorite) {
        ServiceEntity service = favorite.getService();
        FreelancerProfile freelancer = favorite.getFreelancer();

        if (service != null) {
            FreelancerProfile serviceFreelancer = service.getFreelancer();
            User serviceFreelancerUser = serviceFreelancer.getUser();

            return FavoriteDto.builder()
                    .id(favorite.getId())
                    .type("SERVICE")
                    .serviceId(service.getId())
                    .serviceTitle(service.getTitle())
                    .serviceCategoryName(service.getCategory() != null ? service.getCategory().getName() : null)
                    .servicePrice(service.getPrice())
                    .serviceCity(service.getCity())
                    .serviceCoverImageUrl(service.getCoverImageUrl())
                    .freelancerId(serviceFreelancerUser.getId())
                    .freelancerEmail(serviceFreelancerUser.getEmail())
                    .freelancerFirstName(serviceFreelancerUser.getFirstName())
                    .freelancerLastName(serviceFreelancerUser.getLastName())
                    .freelancerCity(serviceFreelancerUser.getCity())
                    .freelancerHeadline(serviceFreelancer.getHeadline())
                    .freelancerRating(serviceFreelancer.getAverageRating())
                    .freelancerTotalReviews(serviceFreelancer.getTotalReviews())
                    .createdAt(favorite.getCreatedAt())
                    .build();
        }

        User freelancerUser = freelancer.getUser();
        return FavoriteDto.builder()
                .id(favorite.getId())
                .type("FREELANCER")
                .freelancerId(freelancerUser.getId())
                .freelancerEmail(freelancerUser.getEmail())
                .freelancerFirstName(freelancerUser.getFirstName())
                .freelancerLastName(freelancerUser.getLastName())
                .freelancerCity(freelancerUser.getCity())
                .freelancerHeadline(freelancer.getHeadline())
                .freelancerRating(freelancer.getAverageRating())
                .freelancerTotalReviews(freelancer.getTotalReviews())
                .createdAt(favorite.getCreatedAt())
                .build();
    }
}

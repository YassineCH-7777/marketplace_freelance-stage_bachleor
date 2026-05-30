package com.marketplace.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReviewDto {
    private Long id;
    private Long orderId;
    private Long freelancerId;
    private Long clientId;
    private String clientEmail;
    private Integer rating;
    private Integer qualityRating;
    private Integer punctualityRating;
    private Integer communicationRating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

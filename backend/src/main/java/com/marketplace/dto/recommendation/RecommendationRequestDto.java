package com.marketplace.dto.recommendation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RecommendationRequestDto {
    private String keyword;
    private String description;
    private Long categoryId;
    private String categoryName;
    private String city;
    private String mode;
    private BigDecimal maxBudget;
    private Integer maxDeliveryDays;
    private Integer limit;
}

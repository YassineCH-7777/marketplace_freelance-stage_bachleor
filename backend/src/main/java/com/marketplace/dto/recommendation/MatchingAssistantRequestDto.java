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
public class MatchingAssistantRequestDto {
    private String need;
    private String city;
    private BigDecimal maxBudget;
    private Integer maxDeliveryDays;
    private Integer limit;
}

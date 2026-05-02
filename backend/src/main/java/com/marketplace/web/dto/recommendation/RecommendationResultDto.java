package com.marketplace.web.dto.recommendation;

import com.marketplace.web.dto.service.ServiceDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RecommendationResultDto {
    private ServiceDto service;
    private Double score;
    private List<String> reasons;
    private Map<String, Double> scoreDetails;
}

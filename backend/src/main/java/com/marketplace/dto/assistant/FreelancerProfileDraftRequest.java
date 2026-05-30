package com.marketplace.dto.assistant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FreelancerProfileDraftRequest {
    private Long userId;
    private String headline;
    private String professionalBio;
    private List<String> skills;
    private String city;
    private String availability;
    private BigDecimal hourlyRate;
    private String portfolioUrl;
    private List<String> primaryCategories;
    private String remoteMode;
    private Integer profileCompletionScore;
}

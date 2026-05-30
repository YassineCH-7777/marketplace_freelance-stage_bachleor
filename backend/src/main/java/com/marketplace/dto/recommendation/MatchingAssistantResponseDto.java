package com.marketplace.dto.recommendation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MatchingAssistantResponseDto {
    private String summary;
    private RecommendationRequestDto interpretedRequest;
    private List<String> extractedKeywords;
    private List<RecommendationResultDto> recommendations;
}

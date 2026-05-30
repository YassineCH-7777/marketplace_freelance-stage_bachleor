package com.marketplace.controller;

import com.marketplace.service.RecommendationService;
import com.marketplace.dto.recommendation.MatchingAssistantRequestDto;
import com.marketplace.dto.recommendation.MatchingAssistantResponseDto;
import com.marketplace.dto.recommendation.RecommendationRequestDto;
import com.marketplace.dto.recommendation.RecommendationResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping
    public ResponseEntity<List<RecommendationResultDto>> recommendFreelancers(
            @ModelAttribute RecommendationRequestDto request
    ) {
        return ResponseEntity.ok(recommendationService.recommendFreelancers(request));
    }

    @PostMapping("/match")
    public ResponseEntity<MatchingAssistantResponseDto> matchClientNeed(
            @RequestBody MatchingAssistantRequestDto request
    ) {
        return ResponseEntity.ok(recommendationService.matchClientNeed(request));
    }
}

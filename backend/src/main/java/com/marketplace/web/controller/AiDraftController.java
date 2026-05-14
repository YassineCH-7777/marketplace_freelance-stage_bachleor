package com.marketplace.web.controller;

import com.marketplace.application.service.AiDraftService;
import com.marketplace.web.dto.assistant.ClientRequestDraftDto;
import com.marketplace.web.dto.assistant.ClientRequestDraftRequest;
import com.marketplace.web.dto.assistant.FreelancerProfileDraftDto;
import com.marketplace.web.dto.assistant.FreelancerProfileDraftRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiDraftController {

    private final AiDraftService aiDraftService;

    @PostMapping("/requests/draft")
    public ResponseEntity<ClientRequestDraftDto> saveClientRequestDraft(@RequestBody ClientRequestDraftRequest request) {
        return ResponseEntity.ok(aiDraftService.saveClientRequestDraft(request));
    }

    @PostMapping("/freelancers/profile/draft")
    public ResponseEntity<FreelancerProfileDraftDto> saveFreelancerProfileDraft(
            @RequestBody FreelancerProfileDraftRequest request) {
        return ResponseEntity.ok(aiDraftService.saveFreelancerProfileDraft(request));
    }
}

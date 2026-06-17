package com.marketplace.controller;

import com.marketplace.model.User;
import com.marketplace.service.MissionReportService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class MissionReportController {

    private final MissionReportService missionReportService;

    /**
     * Genere et telecharge le rapport PDF d'une mission accessible a l'utilisateur.
     */
    @GetMapping("/{id}/report")
    public ResponseEntity<byte[]> downloadMissionReport(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        byte[] report = missionReportService.generateMissionReport(id, user.getId());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("rapport-mission-" + id + ".pdf")
                .build());

        return ResponseEntity.ok()
                .headers(headers)
                .body(report);
    }
}

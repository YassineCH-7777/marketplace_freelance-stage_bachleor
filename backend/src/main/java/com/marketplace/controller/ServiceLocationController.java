package com.marketplace.controller;

import com.marketplace.dto.service.ServiceDto;
import com.marketplace.dto.service.ServiceLocationRequest;
import com.marketplace.model.User;
import com.marketplace.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceLocationController {

    private final ServiceService serviceService;

    /**
     * Met a jour la zone d'intervention d'une offre apres controle du proprietaire.
     */
    @PostMapping("/{id}/location")
    public ResponseEntity<ServiceDto> updateServiceLocation(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody ServiceLocationRequest request) {
        return ResponseEntity.ok(serviceService.updateServiceLocation(id, user.getId(), request));
    }
}

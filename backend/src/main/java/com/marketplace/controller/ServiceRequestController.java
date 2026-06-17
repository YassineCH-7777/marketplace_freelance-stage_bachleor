package com.marketplace.controller;

import com.marketplace.service.ServiceRequestService;
import com.marketplace.dto.request.ServiceRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    /**
     * Publie la liste des demandes ouvertes consultables par les freelances.
     */
    @GetMapping
    public ResponseEntity<List<ServiceRequestDto>> getOpenRequests() {
        return ResponseEntity.ok(serviceRequestService.getOpenServiceRequests());
    }

    /**
     * Filtre les demandes publiques par mot-cle, categorie, ville ou urgence.
     */
    @GetMapping("/search")
    public ResponseEntity<List<ServiceRequestDto>> searchRequests(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Boolean urgent) {
        return ResponseEntity.ok(serviceRequestService.searchServiceRequests(keyword, categoryId, city, urgent));
    }

    /**
     * Affiche le detail d'une demande publique et ses informations utiles.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequestDto> getRequestDetail(@PathVariable Long id) {
        return ResponseEntity.ok(serviceRequestService.getServiceRequestDetail(id));
    }
}

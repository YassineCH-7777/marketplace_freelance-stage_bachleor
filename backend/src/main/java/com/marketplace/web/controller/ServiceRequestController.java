package com.marketplace.web.controller;

import com.marketplace.application.service.ServiceRequestService;
import com.marketplace.web.dto.request.ServiceRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/requests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    @GetMapping
    public ResponseEntity<List<ServiceRequestDto>> getOpenRequests() {
        return ResponseEntity.ok(serviceRequestService.getOpenServiceRequests());
    }

    @GetMapping("/search")
    public ResponseEntity<List<ServiceRequestDto>> searchRequests(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Boolean urgent) {
        return ResponseEntity.ok(serviceRequestService.searchServiceRequests(keyword, categoryId, city, urgent));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequestDto> getRequestDetail(@PathVariable Long id) {
        return ResponseEntity.ok(serviceRequestService.getServiceRequestDetail(id));
    }
}

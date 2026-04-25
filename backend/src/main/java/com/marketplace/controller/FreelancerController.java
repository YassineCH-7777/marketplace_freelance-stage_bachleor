package com.marketplace.controller;

import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderExecutionUpdateDto;
import com.marketplace.dto.order.OrderRequestDto;
import com.marketplace.dto.service.ServiceDto;
import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.entity.User;
import com.marketplace.service.FreelancerProfileService;
import com.marketplace.service.OrderService;
import com.marketplace.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/freelancer")
@RequiredArgsConstructor
// @PreAuthorize("hasRole('FREELANCER')") // En attente de protection stricte
public class FreelancerController {

    private final ServiceService serviceService;
    private final OrderService orderService;
    private final FreelancerProfileService profileService;

    // --- Profile Management ---
    @PutMapping("/profile")
    public ResponseEntity<FreelancerProfileDto> updateProfile(@AuthenticationPrincipal User user, @RequestBody FreelancerProfileDto dto) {
        return ResponseEntity.ok(profileService.updateProfile(user.getId(), dto));
    }

    // --- Services Management ---
    
    @PostMapping("/services")
    public ResponseEntity<ServiceDto> createService(@AuthenticationPrincipal User user, @RequestBody ServiceDto dto) {
        return ResponseEntity.ok(serviceService.createService(user.getId(), dto));
    }

    @PutMapping("/services/{id}")
    public ResponseEntity<ServiceDto> updateService(@PathVariable Long id, @AuthenticationPrincipal User user, @RequestBody ServiceDto dto) {
        return ResponseEntity.ok(serviceService.updateService(id, user.getId(), dto));
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<Void> archiveService(@PathVariable Long id, @AuthenticationPrincipal User user) {
        serviceService.deleteService(id, user.getId());
        return ResponseEntity.ok().build();
    }

    // --- Orders Management ---

    @GetMapping("/requests")
    public ResponseEntity<List<OrderRequestDto>> getIncomingRequests(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getIncomingRequests(user.getId()));
    }

    @PutMapping("/requests/{id}/accept")
    public ResponseEntity<Void> acceptRequest(@PathVariable Long id, @AuthenticationPrincipal User user) {
        orderService.acceptRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/requests/{id}/refuse")
    public ResponseEntity<Void> refuseRequest(@PathVariable Long id, @AuthenticationPrincipal User user) {
        orderService.refuseRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderDto>> getOngoingOrders(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getFreelancerOrders(user.getId()));
    }

    @PutMapping("/orders/{id}")
    public ResponseEntity<OrderDto> updateOrderExecution(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody OrderExecutionUpdateDto dto) {
        return ResponseEntity.ok(orderService.updateFreelancerOrder(id, user.getId(), dto));
    }
}

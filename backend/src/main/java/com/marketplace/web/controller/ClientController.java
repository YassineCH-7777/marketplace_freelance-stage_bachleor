package com.marketplace.web.controller;

import com.marketplace.web.dto.order.OrderDto;
import com.marketplace.web.dto.order.OrderClientDecisionDto;
import com.marketplace.web.dto.order.OrderDisputeRequestDto;
import com.marketplace.web.dto.order.OrderRequestDto;
import com.marketplace.web.dto.favorite.FavoriteDto;
import com.marketplace.web.dto.request.ProposalDto;
import com.marketplace.web.dto.request.ServiceRequestDto;
import com.marketplace.web.dto.review.ReviewDto;
import com.marketplace.web.dto.user.UserDto;
import com.marketplace.domain.model.User;
import com.marketplace.application.service.ClientProfileService;
import com.marketplace.application.service.FavoriteService;
import com.marketplace.application.service.OrderService;
import com.marketplace.application.service.ProposalService;
import com.marketplace.application.service.ReviewService;
import com.marketplace.application.service.ServiceRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client")
@RequiredArgsConstructor
public class ClientController {

    private final OrderService orderService;
    private final ReviewService reviewService;
    private final ClientProfileService clientProfileService;
    private final ServiceRequestService serviceRequestService;
    private final ProposalService proposalService;
    private final FavoriteService favoriteService;

    @GetMapping("/profile")
    public ResponseEntity<UserDto> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clientProfileService.getProfile(user.getId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UserDto dto) {
        return ResponseEntity.ok(clientProfileService.updateProfile(user.getId(), dto));
    }

    @PostMapping("/requests")
    public ResponseEntity<OrderRequestDto> sendOrderRequest(
            @AuthenticationPrincipal User user, 
            @RequestBody OrderRequestDto dto) {
        return ResponseEntity.ok(orderService.createOrderRequest(user.getId(), dto));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderDto>> getClientOrders(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getClientOrders(user.getId()));
    }

    @PutMapping("/orders/{id}/confirm-payment")
    public ResponseEntity<OrderDto> confirmEscrowPayment(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.confirmEscrowPayment(id, user.getId()));
    }

    @PutMapping("/orders/{id}/accept-delivery")
    public ResponseEntity<OrderDto> acceptDelivery(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) OrderClientDecisionDto dto) {
        return ResponseEntity.ok(orderService.acceptDelivery(id, user.getId(), dto));
    }

    @PutMapping("/orders/{id}/request-revision")
    public ResponseEntity<OrderDto> requestRevision(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody OrderClientDecisionDto dto) {
        return ResponseEntity.ok(orderService.requestRevision(id, user.getId(), dto));
    }

    @PutMapping("/orders/{id}/dispute")
    public ResponseEntity<OrderDto> openDispute(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody OrderDisputeRequestDto dto) {
        return ResponseEntity.ok(orderService.openClientDispute(id, user.getId(), dto));
    }

    @PostMapping("/reviews")
    public ResponseEntity<ReviewDto> leaveReview(
            @AuthenticationPrincipal User user, 
            @RequestBody ReviewDto dto) {
        return ResponseEntity.ok(reviewService.leaveReview(user.getId(), dto));
    }

    // --- Favorites ---

    @GetMapping("/favorites")
    public ResponseEntity<List<FavoriteDto>> getFavorites(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.getClientFavorites(user.getId()));
    }

    @PostMapping("/favorites/services/{serviceId}")
    public ResponseEntity<FavoriteDto> addServiceFavorite(
            @PathVariable Long serviceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.addServiceFavorite(user.getId(), serviceId));
    }

    @DeleteMapping("/favorites/services/{serviceId}")
    public ResponseEntity<Void> removeServiceFavorite(
            @PathVariable Long serviceId,
            @AuthenticationPrincipal User user) {
        favoriteService.removeServiceFavorite(user.getId(), serviceId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/favorites/freelancers/{freelancerUserId}")
    public ResponseEntity<FavoriteDto> addFreelancerFavorite(
            @PathVariable Long freelancerUserId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.addFreelancerFavorite(user.getId(), freelancerUserId));
    }

    @DeleteMapping("/favorites/freelancers/{freelancerUserId}")
    public ResponseEntity<Void> removeFreelancerFavorite(
            @PathVariable Long freelancerUserId,
            @AuthenticationPrincipal User user) {
        favoriteService.removeFreelancerFavorite(user.getId(), freelancerUserId);
        return ResponseEntity.ok().build();
    }

    // --- Service Requests (demand-driven marketplace) ---

    @PostMapping("/service-requests")
    public ResponseEntity<ServiceRequestDto> createServiceRequest(
            @AuthenticationPrincipal User user,
            @RequestBody ServiceRequestDto dto) {
        return ResponseEntity.ok(serviceRequestService.createServiceRequest(user.getId(), dto));
    }

    @GetMapping("/service-requests")
    public ResponseEntity<List<ServiceRequestDto>> getMyServiceRequests(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(serviceRequestService.getClientServiceRequests(user.getId()));
    }

    @GetMapping("/service-requests/{id}")
    public ResponseEntity<ServiceRequestDto> getServiceRequestDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(serviceRequestService.getServiceRequestDetail(id));
    }

    @PutMapping("/service-requests/{id}")
    public ResponseEntity<ServiceRequestDto> updateServiceRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody ServiceRequestDto dto) {
        return ResponseEntity.ok(serviceRequestService.updateServiceRequest(id, user.getId(), dto));
    }

    @DeleteMapping("/service-requests/{id}")
    public ResponseEntity<Void> cancelServiceRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        serviceRequestService.cancelServiceRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/service-requests/{id}/close")
    public ResponseEntity<Void> closeServiceRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        proposalService.closeServiceRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/service-requests/{requestId}/proposals/{proposalId}/accept")
    public ResponseEntity<ProposalDto> acceptProposal(
            @PathVariable Long requestId,
            @PathVariable Long proposalId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(proposalService.acceptProposal(proposalId, user.getId()));
    }

    @PutMapping("/service-requests/{requestId}/proposals/{proposalId}/reject")
    public ResponseEntity<ProposalDto> rejectProposal(
            @PathVariable Long requestId,
            @PathVariable Long proposalId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(proposalService.rejectProposal(proposalId, user.getId()));
    }
}

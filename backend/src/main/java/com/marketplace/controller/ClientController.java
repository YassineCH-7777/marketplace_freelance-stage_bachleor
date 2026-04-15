package com.marketplace.controller;

import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderRequestDto;
import com.marketplace.dto.review.ReviewDto;
import com.marketplace.entity.User;
import com.marketplace.service.OrderService;
import com.marketplace.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client")
@RequiredArgsConstructor
// @PreAuthorize("hasRole('CLIENT')") // A décommenter avec config Security strict
public class ClientController {

    private final OrderService orderService;
    private final ReviewService reviewService;

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

    @PostMapping("/reviews")
    public ResponseEntity<ReviewDto> leaveReview(
            @AuthenticationPrincipal User user, 
            @RequestBody ReviewDto dto) {
        return ResponseEntity.ok(reviewService.leaveReview(user.getId(), dto));
    }
}

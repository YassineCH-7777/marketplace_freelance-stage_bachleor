package com.marketplace.service;

import com.marketplace.dto.review.ReviewDto;
import com.marketplace.entity.Order;
import com.marketplace.entity.Review;
import com.marketplace.enums.OrderStatus;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public ReviewDto leaveReview(Long clientId, ReviewDto dto) {
        Order order = orderRepository.findById(dto.getOrderId()).orElseThrow();
        
        if (!order.getClient().getId().equals(clientId)) {
            throw new RuntimeException("Seul le client concerné peut laisser un avis.");
        }

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new RuntimeException("La commande doit être terminée pour laisser un avis.");
        }

        Review review = Review.builder()
                .client(order.getClient())
                .freelancer(order.getFreelancer())
                .order(order)
                .rating(dto.getRating())
                .comment(dto.getComment())
                .build();

        return mapToDto(reviewRepository.save(review));
    }

    public List<ReviewDto> getReviewsByFreelancer(Long freelancerId) {
        return reviewRepository.findByFreelancer_Id(freelancerId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private ReviewDto mapToDto(Review r) {
        return ReviewDto.builder()
                .id(r.getId())
                .orderId(r.getOrder().getId())
                .freelancerId(r.getFreelancer().getId())
                .clientId(r.getClient().getId())
                .clientEmail(r.getClient().getEmail())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}

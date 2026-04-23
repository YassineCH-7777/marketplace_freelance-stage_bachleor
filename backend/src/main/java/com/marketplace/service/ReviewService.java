package com.marketplace.service;

import com.marketplace.dto.review.ReviewDto;
import com.marketplace.entity.Order;
import com.marketplace.entity.Review;
import com.marketplace.enums.OrderStatus;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
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
        Order order = orderRepository.findById(dto.getOrderId()).orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        
        if (!order.getClient().getId().equals(clientId)) {
            throw new BusinessException("Seul le client concerné peut laisser un avis.", org.springframework.http.HttpStatus.FORBIDDEN);
        }

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BusinessException("La commande doit être terminée pour laisser un avis.", org.springframework.http.HttpStatus.BAD_REQUEST);
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
        return reviewRepository.findByFreelancer_User_Id(freelancerId)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private ReviewDto mapToDto(Review r) {
        return ReviewDto.builder()
                .id(r.getId())
                .orderId(r.getOrder().getId())
                .freelancerId(r.getFreelancer().getUser().getId())
                .clientId(r.getClient().getId())
                .clientEmail(r.getClient().getEmail())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}

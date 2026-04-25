package com.marketplace.service;

import com.marketplace.dto.review.ReviewDto;
import com.marketplace.entity.Order;
import com.marketplace.entity.Review;
import com.marketplace.enums.OrderStatus;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
        if (dto.getOrderId() == null) {
            throw new BusinessException("La commande a evaluer est obligatoire.", HttpStatus.BAD_REQUEST);
        }

        Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));

        if (!order.getClient().getId().equals(clientId)) {
            throw new BusinessException("Seul le client concerne peut laisser un avis.", HttpStatus.FORBIDDEN);
        }

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new BusinessException("La commande doit etre terminee pour laisser un avis.", HttpStatus.BAD_REQUEST);
        }

        int qualityRating = resolveAxisRating(dto.getQualityRating(), dto.getRating(), "qualite");
        int punctualityRating = resolveAxisRating(dto.getPunctualityRating(), dto.getRating(), "ponctualite");
        int communicationRating = resolveAxisRating(dto.getCommunicationRating(), dto.getRating(), "communication");
        int overallRating = computeOverallRating(qualityRating, punctualityRating, communicationRating);
        String normalizedComment = normalizeComment(dto.getComment());

        Review review = reviewRepository.findByOrder_Id(order.getId())
                .map(existingReview -> updateExistingReview(
                        existingReview,
                        clientId,
                        overallRating,
                        qualityRating,
                        punctualityRating,
                        communicationRating,
                        normalizedComment
                ))
                .orElseGet(() -> Review.builder()
                        .client(order.getClient())
                        .freelancer(order.getFreelancer())
                        .order(order)
                        .rating(overallRating)
                        .qualityRating(qualityRating)
                        .punctualityRating(punctualityRating)
                        .communicationRating(communicationRating)
                        .comment(normalizedComment)
                        .build());

        return mapToDto(reviewRepository.save(review));
    }

    public List<ReviewDto> getReviewsByFreelancer(Long freelancerId) {
        return reviewRepository.findByFreelancer_User_IdOrderByCreatedAtDesc(freelancerId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private Review updateExistingReview(
            Review existingReview,
            Long clientId,
            int overallRating,
            int qualityRating,
            int punctualityRating,
            int communicationRating,
            String normalizedComment
    ) {
        if (!existingReview.getClient().getId().equals(clientId)) {
            throw new BusinessException("Seul le client auteur peut modifier cet avis.", HttpStatus.FORBIDDEN);
        }

        existingReview.setRating(overallRating);
        existingReview.setQualityRating(qualityRating);
        existingReview.setPunctualityRating(punctualityRating);
        existingReview.setCommunicationRating(communicationRating);
        existingReview.setComment(normalizedComment);
        return existingReview;
    }

    private ReviewDto mapToDto(Review review) {
        int qualityRating = defaultAxisRating(review.getQualityRating(), review.getRating());
        int punctualityRating = defaultAxisRating(review.getPunctualityRating(), review.getRating());
        int communicationRating = defaultAxisRating(review.getCommunicationRating(), review.getRating());

        return ReviewDto.builder()
                .id(review.getId())
                .orderId(review.getOrder().getId())
                .freelancerId(review.getFreelancer().getUser().getId())
                .clientId(review.getClient().getId())
                .clientEmail(review.getClient().getEmail())
                .rating(review.getRating() != null
                        ? review.getRating()
                        : computeOverallRating(qualityRating, punctualityRating, communicationRating))
                .qualityRating(qualityRating)
                .punctualityRating(punctualityRating)
                .communicationRating(communicationRating)
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private int resolveAxisRating(Integer axisRating, Integer fallbackRating, String label) {
        Integer resolvedRating = axisRating != null ? axisRating : fallbackRating;
        if (resolvedRating == null) {
            throw new BusinessException("La note de " + label + " est obligatoire.", HttpStatus.BAD_REQUEST);
        }
        if (resolvedRating < 1 || resolvedRating > 5) {
            throw new BusinessException("La note de " + label + " doit etre comprise entre 1 et 5.", HttpStatus.BAD_REQUEST);
        }
        return resolvedRating;
    }

    private int defaultAxisRating(Integer axisRating, Integer fallbackRating) {
        if (axisRating != null) {
            return axisRating;
        }
        if (fallbackRating != null) {
            return fallbackRating;
        }
        return 0;
    }

    private int computeOverallRating(int qualityRating, int punctualityRating, int communicationRating) {
        return (int) Math.round((qualityRating + punctualityRating + communicationRating) / 3.0);
    }

    private String normalizeComment(String comment) {
        if (comment == null) {
            return null;
        }

        String normalizedComment = comment.trim();
        return normalizedComment.isEmpty() ? null : normalizedComment;
    }
}

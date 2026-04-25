package com.marketplace.service;

import com.marketplace.dto.review.ReviewDto;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.Order;
import com.marketplace.entity.Review;
import com.marketplace.entity.User;
import com.marketplace.enums.OrderStatus;
import com.marketplace.exception.BusinessException;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.ReviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private ReviewService reviewService;

    @Test
    void leaveReviewCreatesNewReviewWhenOrderHasNoReviewYet() {
        User client = clientUser(5L, "client@marketplace.com");
        Order order = completedOrder(4L, client);
        ReviewDto request = ReviewDto.builder()
                .orderId(4L)
                .qualityRating(5)
                .punctualityRating(4)
                .communicationRating(5)
                .comment("Tres bon travail")
                .build();

        when(orderRepository.findById(4L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(4L)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> {
            Review saved = invocation.getArgument(0);
            saved.setId(11L);
            saved.setCreatedAt(LocalDateTime.of(2026, 4, 25, 12, 0));
            return saved;
        });

        ReviewDto result = reviewService.leaveReview(5L, request);

        ArgumentCaptor<Review> reviewCaptor = ArgumentCaptor.forClass(Review.class);
        verify(reviewRepository).save(reviewCaptor.capture());
        Review savedReview = reviewCaptor.getValue();

        assertThat(savedReview.getId()).isEqualTo(11L);
        assertThat(savedReview.getOrder()).isSameAs(order);
        assertThat(savedReview.getClient()).isSameAs(client);
        assertThat(savedReview.getRating()).isEqualTo(5);
        assertThat(savedReview.getQualityRating()).isEqualTo(5);
        assertThat(savedReview.getPunctualityRating()).isEqualTo(4);
        assertThat(savedReview.getCommunicationRating()).isEqualTo(5);
        assertThat(savedReview.getComment()).isEqualTo("Tres bon travail");
        assertThat(result.getId()).isEqualTo(11L);
        assertThat(result.getOrderId()).isEqualTo(4L);
        assertThat(result.getRating()).isEqualTo(5);
        assertThat(result.getQualityRating()).isEqualTo(5);
        assertThat(result.getPunctualityRating()).isEqualTo(4);
        assertThat(result.getCommunicationRating()).isEqualTo(5);
        assertThat(result.getComment()).isEqualTo("Tres bon travail");
    }

    @Test
    void leaveReviewUpdatesExistingReviewForSameOrder() {
        User client = clientUser(5L, "client@marketplace.com");
        Order order = completedOrder(4L, client);
        Review existingReview = Review.builder()
                .id(9L)
                .order(order)
                .client(client)
                .freelancer(order.getFreelancer())
                .rating(2)
                .qualityRating(2)
                .punctualityRating(2)
                .communicationRating(2)
                .comment("Ancien avis")
                .createdAt(LocalDateTime.of(2026, 4, 20, 10, 0))
                .build();
        ReviewDto request = ReviewDto.builder()
                .orderId(4L)
                .qualityRating(4)
                .punctualityRating(5)
                .communicationRating(3)
                .comment("Avis mis a jour")
                .build();

        when(orderRepository.findById(4L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(4L)).thenReturn(Optional.of(existingReview));
        when(reviewRepository.save(existingReview)).thenReturn(existingReview);

        ReviewDto result = reviewService.leaveReview(5L, request);

        verify(reviewRepository).save(existingReview);
        assertThat(existingReview.getId()).isEqualTo(9L);
        assertThat(existingReview.getRating()).isEqualTo(4);
        assertThat(existingReview.getQualityRating()).isEqualTo(4);
        assertThat(existingReview.getPunctualityRating()).isEqualTo(5);
        assertThat(existingReview.getCommunicationRating()).isEqualTo(3);
        assertThat(existingReview.getComment()).isEqualTo("Avis mis a jour");
        assertThat(result.getId()).isEqualTo(9L);
        assertThat(result.getOrderId()).isEqualTo(4L);
        assertThat(result.getRating()).isEqualTo(4);
        assertThat(result.getQualityRating()).isEqualTo(4);
        assertThat(result.getPunctualityRating()).isEqualTo(5);
        assertThat(result.getCommunicationRating()).isEqualTo(3);
        assertThat(result.getComment()).isEqualTo("Avis mis a jour");
    }

    @Test
    void leaveReviewRejectsUpdatingReviewOwnedByAnotherClient() {
        User orderClient = clientUser(5L, "client@marketplace.com");
        User otherClient = clientUser(8L, "other@marketplace.com");
        Order order = completedOrder(4L, orderClient);
        Review existingReview = Review.builder()
                .id(9L)
                .order(order)
                .client(otherClient)
                .freelancer(order.getFreelancer())
                .rating(2)
                .qualityRating(2)
                .punctualityRating(2)
                .communicationRating(2)
                .comment("Ancien avis")
                .build();
        ReviewDto request = ReviewDto.builder()
                .orderId(4L)
                .qualityRating(4)
                .punctualityRating(4)
                .communicationRating(4)
                .comment("Tentative de mise a jour")
                .build();

        when(orderRepository.findById(4L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(4L)).thenReturn(Optional.of(existingReview));

        assertThatThrownBy(() -> reviewService.leaveReview(5L, request))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void leaveReviewUsesSingleRatingAsFallbackForAllAxes() {
        User client = clientUser(5L, "client@marketplace.com");
        Order order = completedOrder(4L, client);
        ReviewDto request = ReviewDto.builder()
                .orderId(4L)
                .rating(3)
                .comment("Mission correcte")
                .build();

        when(orderRepository.findById(4L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(4L)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(Review.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewDto result = reviewService.leaveReview(5L, request);

        assertThat(result.getRating()).isEqualTo(3);
        assertThat(result.getQualityRating()).isEqualTo(3);
        assertThat(result.getPunctualityRating()).isEqualTo(3);
        assertThat(result.getCommunicationRating()).isEqualTo(3);
    }

    private Order completedOrder(Long orderId, User client) {
        User freelancerUser = User.builder()
                .id(13L)
                .email("freelancer@marketplace.com")
                .password("hashed")
                .build();

        FreelancerProfile freelancer = FreelancerProfile.builder()
                .id(21L)
                .user(freelancerUser)
                .build();

        return Order.builder()
                .id(orderId)
                .client(client)
                .freelancer(freelancer)
                .status(OrderStatus.COMPLETED)
                .build();
    }

    private User clientUser(Long id, String email) {
        return User.builder()
                .id(id)
                .email(email)
                .password("hashed")
                .build();
    }
}

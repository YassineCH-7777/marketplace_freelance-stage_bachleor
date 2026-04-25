package com.marketplace.service;

import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderExecutionUpdateDto;
import com.marketplace.entity.Category;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.Order;
import com.marketplace.entity.OrderRequest;
import com.marketplace.entity.Review;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.User;
import com.marketplace.enums.OrderStatus;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.OrderRequestRepository;
import com.marketplace.repository.ReviewRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderRequestRepository orderRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ServiceRepository serviceRepository;

    @Mock
    private FreelancerProfileRepository freelancerProfileRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @InjectMocks
    private OrderService orderService;

    @Test
    void updateFreelancerOrderUpdatesMissionExecutionData() {
        Order order = buildOrder(17L, 13L);
        OrderExecutionUpdateDto request = OrderExecutionUpdateDto.builder()
                .status(OrderStatus.IN_PROGRESS)
                .startDate(LocalDate.of(2026, 4, 26))
                .notes("Checklist validee, intervention en cours.")
                .build();

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(17L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderDto result = orderService.updateFreelancerOrder(17L, 13L, request);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.IN_PROGRESS);
        assertThat(order.getStartDate()).isEqualTo(LocalDate.of(2026, 4, 26));
        assertThat(order.getNotes()).isEqualTo("Checklist validee, intervention en cours.");
        assertThat(result.getFreelancerEmail()).isEqualTo("freelancer@marketplace.com");
        assertThat(result.getRequestMessage()).isEqualTo("Besoin d'une mission terrain rapide");
        assertThat(result.getNotes()).isEqualTo("Checklist validee, intervention en cours.");
    }

    @Test
    void updateFreelancerOrderAutoSetsEndDateWhenCompletingMission() {
        Order order = buildOrder(17L, 13L);
        OrderExecutionUpdateDto request = OrderExecutionUpdateDto.builder()
                .status(OrderStatus.COMPLETED)
                .notes("Livraison effectuee et compte-rendu final partage.")
                .build();

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(17L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderDto result = orderService.updateFreelancerOrder(17L, 13L, request);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(order.getEndDate()).isEqualTo(LocalDate.now());
        assertThat(result.getEndDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void updateFreelancerOrderRejectsPendingStatus() {
        Order order = buildOrder(17L, 13L);
        OrderExecutionUpdateDto request = OrderExecutionUpdateDto.builder()
                .status(OrderStatus.PENDING)
                .build();

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateFreelancerOrder(17L, 13L, request))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void updateFreelancerOrderRejectsAnotherFreelancer() {
        Order order = buildOrder(17L, 13L);
        OrderExecutionUpdateDto request = OrderExecutionUpdateDto.builder()
                .status(OrderStatus.IN_PROGRESS)
                .build();

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateFreelancerOrder(17L, 99L, request))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void updateFreelancerOrderReturnsExistingReviewDetailsForEditing() {
        Order order = buildOrder(17L, 13L);
        Review review = Review.builder()
                .id(88L)
                .order(order)
                .client(order.getClient())
                .freelancer(order.getFreelancer())
                .rating(4)
                .qualityRating(5)
                .punctualityRating(4)
                .communicationRating(3)
                .comment("Bon suivi local")
                .updatedAt(LocalDateTime.of(2026, 4, 25, 11, 30))
                .build();
        OrderExecutionUpdateDto request = OrderExecutionUpdateDto.builder()
                .status(OrderStatus.IN_PROGRESS)
                .notes("Suivi partage avec le client.")
                .build();

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(17L)).thenReturn(Optional.of(review));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderDto result = orderService.updateFreelancerOrder(17L, 13L, request);

        assertThat(result.getReviewId()).isEqualTo(88L);
        assertThat(result.getReviewRating()).isEqualTo(4);
        assertThat(result.getReviewQualityRating()).isEqualTo(5);
        assertThat(result.getReviewPunctualityRating()).isEqualTo(4);
        assertThat(result.getReviewCommunicationRating()).isEqualTo(3);
        assertThat(result.getReviewComment()).isEqualTo("Bon suivi local");
        assertThat(result.getReviewUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 4, 25, 11, 30));
    }

    private Order buildOrder(Long orderId, Long freelancerUserId) {
        User client = User.builder()
                .id(5L)
                .email("client@marketplace.com")
                .password("hashed")
                .build();

        User freelancerUser = User.builder()
                .id(freelancerUserId)
                .email("freelancer@marketplace.com")
                .password("hashed")
                .build();

        FreelancerProfile freelancer = FreelancerProfile.builder()
                .id(21L)
                .user(freelancerUser)
                .build();

        Category category = Category.builder()
                .id(8L)
                .name("Photo")
                .slug("photo")
                .isActive(true)
                .build();

        ServiceEntity service = ServiceEntity.builder()
                .id(3L)
                .title("Reportage photo local")
                .category(category)
                .build();

        OrderRequest request = OrderRequest.builder()
                .id(11L)
                .service(service)
                .client(client)
                .message("Besoin d'une mission terrain rapide")
                .proposedBudget(new BigDecimal("900.00"))
                .build();

        return Order.builder()
                .id(orderId)
                .request(request)
                .service(service)
                .client(client)
                .freelancer(freelancer)
                .agreedPrice(new BigDecimal("900.00"))
                .status(OrderStatus.IN_PROGRESS)
                .createdAt(LocalDateTime.of(2026, 4, 24, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 25, 9, 0))
                .build();
    }
}

package com.marketplace.application.service;

import com.marketplace.web.dto.order.OrderDto;
import com.marketplace.web.dto.order.OrderExecutionUpdateDto;
import com.marketplace.domain.model.Category;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.Order;
import com.marketplace.domain.model.OrderRequest;
import com.marketplace.domain.model.Review;
import com.marketplace.domain.model.ServiceEntity;
import com.marketplace.domain.model.User;
import com.marketplace.domain.enums.OrderStatus;
import com.marketplace.domain.enums.PaymentStatus;
import com.marketplace.domain.model.Attachment;
import com.marketplace.web.exception.BusinessException;
import com.marketplace.web.exception.UnauthorizedException;
import com.marketplace.infrastructure.persistence.AttachmentRepository;
import com.marketplace.infrastructure.persistence.FreelancerProfileRepository;
import com.marketplace.infrastructure.persistence.MissionActivityRepository;
import com.marketplace.infrastructure.persistence.MissionMilestoneRepository;
import com.marketplace.infrastructure.persistence.OrderRepository;
import com.marketplace.infrastructure.persistence.OrderRequestRepository;
import com.marketplace.infrastructure.persistence.ReviewRepository;
import com.marketplace.infrastructure.persistence.ServiceRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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

    @Mock
    private MissionActivityRepository missionActivityRepository;

    @Mock
    private MissionMilestoneRepository missionMilestoneRepository;

    @Mock
    private MessageService messageService;

    @Mock
    private AttachmentRepository attachmentRepository;

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
        assertThat(order.getProgressPercentage()).isEqualTo(30);
        assertThat(order.getStartDate()).isEqualTo(LocalDate.of(2026, 4, 26));
        assertThat(order.getNotes()).isEqualTo("Checklist validee, intervention en cours.");
        assertThat(result.getFreelancerEmail()).isEqualTo("freelancer@marketplace.com");
        assertThat(result.getRequestMessage()).isEqualTo("Besoin d'une mission terrain rapide");
        assertThat(result.getNotes()).isEqualTo("Checklist validee, intervention en cours.");
        assertThat(result.getProgressPercentage()).isEqualTo(30);
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

    @Test
    void requestRevisionIncrementsRevisionCount() {
        Order order = buildOrder(17L, 13L);
        order.setStatus(OrderStatus.DELIVERED);
        order.setRevisionCount(1);
        order.setMaxRevisionRounds(3);

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(17L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderDto result = orderService.requestRevision(17L, 5L,
                com.marketplace.web.dto.order.OrderClientDecisionDto.builder()
                        .comment("Merci de corriger la livraison.")
                        .build());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.REVISION);
        assertThat(order.getRevisionCount()).isEqualTo(2);
        assertThat(result.getRevisionCount()).isEqualTo(2);
        assertThat(result.getMaxRevisionRounds()).isEqualTo(3);
    }

    @Test
    void requestRevisionRejectsWhenLimitIsReached() {
        Order order = buildOrder(17L, 13L);
        order.setStatus(OrderStatus.DELIVERED);
        order.setRevisionCount(3);
        order.setMaxRevisionRounds(3);

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.requestRevision(17L, 5L,
                com.marketplace.web.dto.order.OrderClientDecisionDto.builder()
                        .comment("Encore une correction.")
                        .build()))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void acceptDeliveryAllowsInProgressOrderWithSharedDelivery() {
        Order order = buildOrder(17L, 13L);
        order.setStatus(OrderStatus.IN_PROGRESS);
        order.setDeliveryNote("Livraison partagee avec le client.");

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(17L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderDto result = orderService.acceptDelivery(17L, 5L,
                com.marketplace.web.dto.order.OrderClientDecisionDto.builder()
                        .comment("Livraison conforme.")
                        .build());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(result.getProgressPercentage()).isEqualTo(100);
    }

    @Test
    void requestRevisionAllowsInProgressOrderWithSharedDelivery() {
        Order order = buildOrder(17L, 13L);
        order.setStatus(OrderStatus.IN_PROGRESS);
        order.setDeliveryNote("Livraison partagee avec le client.");
        order.setRevisionCount(0);
        order.setMaxRevisionRounds(3);

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));
        when(reviewRepository.findByOrder_Id(17L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderDto result = orderService.requestRevision(17L, 5L,
                com.marketplace.web.dto.order.OrderClientDecisionDto.builder()
                        .comment("Merci de corriger le fichier final.")
                        .build());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.REVISION);
        assertThat(order.getRevisionCount()).isEqualTo(1);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.REVISION);
        assertThat(result.getRevisionRequest()).isEqualTo("Merci de corriger le fichier final.");
    }

    @Test
    void acceptDeliveryAllowsInProgressOrderWithDeliveryProofAttachment() {
        Order order = buildOrder(17L, 13L);
        order.setStatus(OrderStatus.IN_PROGRESS);

        when(orderRepository.findById(17L)).thenReturn(Optional.of(order));
        when(attachmentRepository.findByOrder_IdOrderByCreatedAtAsc(17L))
                .thenReturn(List.of(buildDeliveryProofAttachment(order)));
        when(reviewRepository.findByOrder_Id(17L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderDto result = orderService.acceptDelivery(17L, 5L,
                com.marketplace.web.dto.order.OrderClientDecisionDto.builder()
                        .comment("Fichier de livraison verifie.")
                        .build());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.COMPLETED);
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
                .progressPercentage(25)
                .createdAt(LocalDateTime.of(2026, 4, 24, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 25, 9, 0))
                .build();
    }

    private Attachment buildDeliveryProofAttachment(Order order) {
        return Attachment.builder()
                .id(101L)
                .order(order)
                .attachmentType("DELIVERY_PROOF")
                .originalFileName("rapport-mission.pdf")
                .contentType("application/pdf")
                .fileSize(2048L)
                .fileUrl("/uploads/rapport-mission.pdf")
                .build();
    }
}

package com.marketplace.application.service;

import com.marketplace.domain.enums.MissionActivityType;
import com.marketplace.domain.enums.MissionMilestoneStatus;
import com.marketplace.domain.enums.OrderStatus;
import com.marketplace.domain.enums.PaymentStatus;
import com.marketplace.domain.enums.RequestStatus;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.MissionActivity;
import com.marketplace.domain.model.MissionMilestone;
import com.marketplace.domain.model.Order;
import com.marketplace.domain.model.OrderRequest;
import com.marketplace.domain.model.Review;
import com.marketplace.domain.model.ServiceEntity;
import com.marketplace.domain.model.User;
import com.marketplace.infrastructure.persistence.AttachmentRepository;
import com.marketplace.infrastructure.persistence.FreelancerProfileRepository;
import com.marketplace.infrastructure.persistence.MissionActivityRepository;
import com.marketplace.infrastructure.persistence.MissionMilestoneRepository;
import com.marketplace.infrastructure.persistence.OrderRepository;
import com.marketplace.infrastructure.persistence.OrderRequestRepository;
import com.marketplace.infrastructure.persistence.ReviewRepository;
import com.marketplace.infrastructure.persistence.ServiceRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
import com.marketplace.web.dto.attachment.AttachmentDto;
import com.marketplace.web.dto.order.MissionActivityDto;
import com.marketplace.web.dto.order.MissionMilestoneDto;
import com.marketplace.web.dto.order.OrderClientDecisionDto;
import com.marketplace.web.dto.order.OrderDto;
import com.marketplace.web.dto.order.OrderExecutionUpdateDto;
import com.marketplace.web.dto.order.OrderRequestDto;
import com.marketplace.web.exception.BusinessException;
import com.marketplace.web.exception.ResourceNotFoundException;
import com.marketplace.web.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderRequestRepository orderRequestRepository;
    private final UserRepository userRepository;
    private final ServiceRepository serviceRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;
    private final ReviewRepository reviewRepository;
    private final MissionActivityRepository missionActivityRepository;
    private final MissionMilestoneRepository missionMilestoneRepository;
    private final MessageService messageService;
    private final AttachmentRepository attachmentRepository;

    public List<OrderRequestDto> getIncomingRequests(Long freelancerId) {
        return orderRequestRepository.findByService_Freelancer_User_Id(freelancerId)
                .stream()
                .map(this::mapToRequestDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void acceptRequest(Long requestId, Long freelancerId) {
        OrderRequest request = orderRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
        if (!request.getService().getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        request.setStatus(RequestStatus.ACCEPTED);
        orderRequestRepository.save(request);

        Order order = Order.builder()
                .request(request)
                .service(request.getService())
                .client(request.getClient())
                .freelancer(request.getService().getFreelancer())
                .agreedPrice(resolveAgreedPrice(request))
                .dueDate(request.getProposedDate())
                .status(OrderStatus.ACCEPTED)
                .progressPercentage(15)
                .paymentStatus(PaymentStatus.UNPAID)
                .build();
        Order savedOrder = orderRepository.save(order);

        createDefaultMilestones(savedOrder);
        logActivity(
                savedOrder,
                request.getService().getFreelancer().getUser(),
                MissionActivityType.ACCEPTED,
                "Mission validee",
                "Les conditions ont ete acceptees et la mission est prete a demarrer.");
        messageService.ensureOrderConversation(savedOrder);
    }

    @Transactional
    public void refuseRequest(Long requestId, Long freelancerId) {
        OrderRequest request = orderRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
        if (!request.getService().getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Acces refuse");
        }
        request.setStatus(RequestStatus.REJECTED);
        orderRequestRepository.save(request);
    }

    public List<OrderDto> getFreelancerOrders(Long freelancerId) {
        FreelancerProfile freelancer = freelancerProfileRepository.findByUserId(freelancerId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));
        return orderRepository.findByFreelancer(freelancer)
                .stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderDto updateFreelancerOrder(Long orderId, Long freelancerId, OrderExecutionUpdateDto dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        ensureFreelancerOwnsOrder(order, freelancerId);
        ensureMissionCanBeUpdated(order);

        OrderStatus previousStatus = order.getStatus();
        Integer previousProgress = safeProgress(order.getProgressPercentage());
        OrderStatus nextStatus = dto.getStatus() != null ? dto.getStatus() : order.getStatus();
        if (nextStatus == OrderStatus.PENDING || nextStatus == OrderStatus.ACCEPTED) {
            throw new BusinessException("Le suivi de mission ne peut pas revenir a une etape initiale.", HttpStatus.BAD_REQUEST);
        }

        LocalDate nextStartDate = dto.getStartDate() != null ? dto.getStartDate() : order.getStartDate();
        LocalDate nextEndDate = dto.getEndDate() != null ? dto.getEndDate() : order.getEndDate();

        if (nextStatus == OrderStatus.IN_PROGRESS && nextStartDate == null) {
            nextStartDate = LocalDate.now();
        }

        if (nextStatus == OrderStatus.COMPLETED && nextEndDate == null) {
            nextEndDate = LocalDate.now();
        }

        if (nextStartDate != null && nextEndDate != null && nextEndDate.isBefore(nextStartDate)) {
            throw new BusinessException("La date de fin doit etre posterieure a la date de debut.", HttpStatus.BAD_REQUEST);
        }

        int nextProgress = dto.getProgressPercentage() != null
                ? dto.getProgressPercentage()
                : resolveProgressForStatus(nextStatus, previousProgress);
        validateProgress(nextProgress);

        order.setStatus(nextStatus);
        order.setProgressPercentage(nextProgress);
        order.setStartDate(nextStartDate);
        order.setEndDate(nextEndDate);
        if (dto.getDueDate() != null) {
            order.setDueDate(dto.getDueDate());
        }

        if (dto.getNotes() != null) {
            order.setNotes(normalizeOptionalText(dto.getNotes()));
        }

        if (dto.getDeliveryNote() != null) {
            order.setDeliveryNote(normalizeOptionalText(dto.getDeliveryNote()));
        }

        if (nextStatus == OrderStatus.DELIVERED || nextStatus == OrderStatus.WAITING_CLIENT) {
            order.setPaymentStatus(PaymentStatus.PENDING);
            if (order.getDeliveredAt() == null) {
                order.setDeliveredAt(LocalDateTime.now());
            }
        }

        if (nextStatus == OrderStatus.COMPLETED) {
            order.setProgressPercentage(100);
            order.setPaymentStatus(PaymentStatus.PAID);
        }

        Order savedOrder = orderRepository.save(order);
        logActivity(
                savedOrder,
                savedOrder.getFreelancer().getUser(),
                resolveFreelancerActivityType(previousStatus, nextStatus, previousProgress, safeProgress(savedOrder.getProgressPercentage())),
                resolveFreelancerActivityTitle(nextStatus),
                resolveFreelancerActivityDetails(dto, nextStatus));
        return mapToOrderDto(savedOrder);
    }

    @Transactional
    public MissionMilestoneDto addMissionMilestone(Long orderId, Long freelancerId, MissionMilestoneDto dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        ensureFreelancerOwnsOrder(order, freelancerId);
        ensureMissionCanBeUpdated(order);

        MissionMilestone milestone = MissionMilestone.builder()
                .order(order)
                .title(normalizeRequiredText(dto.getTitle(), "Le titre du jalon est obligatoire."))
                .description(normalizeOptionalText(dto.getDescription()))
                .amount(dto.getAmount())
                .deadline(dto.getDeadline())
                .status(dto.getStatus() != null ? dto.getStatus() : MissionMilestoneStatus.PENDING)
                .sortOrder(dto.getSortOrder() != null
                        ? dto.getSortOrder()
                        : (int) missionMilestoneRepository.countByOrder_Id(orderId) + 1)
                .build();

        MissionMilestone savedMilestone = missionMilestoneRepository.save(milestone);
        logActivity(
                order,
                order.getFreelancer().getUser(),
                MissionActivityType.MILESTONE_UPDATED,
                "Jalon ajoute",
                savedMilestone.getTitle());
        return mapToMilestoneDto(savedMilestone);
    }

    @Transactional
    public MissionMilestoneDto updateMissionMilestone(Long orderId, Long milestoneId, Long freelancerId, MissionMilestoneDto dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        ensureFreelancerOwnsOrder(order, freelancerId);
        ensureMissionCanBeUpdated(order);

        MissionMilestone milestone = missionMilestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Jalon introuvable"));
        if (!milestone.getOrder().getId().equals(orderId)) {
            throw new BusinessException("Ce jalon n'appartient pas a cette mission.", HttpStatus.BAD_REQUEST);
        }

        if (dto.getTitle() != null) {
            milestone.setTitle(normalizeRequiredText(dto.getTitle(), "Le titre du jalon est obligatoire."));
        }
        if (dto.getDescription() != null) {
            milestone.setDescription(normalizeOptionalText(dto.getDescription()));
        }
        if (dto.getAmount() != null) {
            milestone.setAmount(dto.getAmount());
        }
        if (dto.getDeadline() != null) {
            milestone.setDeadline(dto.getDeadline());
        }
        if (dto.getStatus() != null) {
            milestone.setStatus(dto.getStatus());
        }
        if (dto.getSortOrder() != null) {
            milestone.setSortOrder(dto.getSortOrder());
        }

        MissionMilestone savedMilestone = missionMilestoneRepository.save(milestone);
        logActivity(
                order,
                order.getFreelancer().getUser(),
                MissionActivityType.MILESTONE_UPDATED,
                "Jalon mis a jour",
                savedMilestone.getTitle() + " - " + savedMilestone.getStatus());
        return mapToMilestoneDto(savedMilestone);
    }

    @Transactional
    public OrderRequestDto createOrderRequest(Long clientId, OrderRequestDto dto) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));
        ServiceEntity service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));

        if (orderRequestRepository.existsByClient_IdAndService(clientId, service)) {
            throw new BusinessException("Une demande existe deja pour ce service.", HttpStatus.CONFLICT);
        }

        OrderRequest request = OrderRequest.builder()
                .service(service)
                .client(client)
                .message(normalizeRequestMessage(dto.getInitialMessage()))
                .proposedBudget(dto.getProposedPrice())
                .proposedDate(dto.getProposedDate())
                .status(RequestStatus.PENDING)
                .build();

        OrderRequest savedRequest = orderRequestRepository.save(request);
        messageService.addOrderRequestOpeningMessage(savedRequest);
        return mapToRequestDto(savedRequest);
    }

    public List<OrderDto> getClientOrders(Long clientId) {
        return orderRepository.findByClient_Id(clientId)
                .stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderDto acceptDelivery(Long orderId, Long clientId, OrderClientDecisionDto dto) {
        Order order = findClientOrder(orderId, clientId);
        if (order.getStatus() != OrderStatus.DELIVERED && order.getStatus() != OrderStatus.WAITING_CLIENT) {
            throw new BusinessException("La mission doit etre livree avant validation client.", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(OrderStatus.COMPLETED);
        order.setProgressPercentage(100);
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setEndDate(order.getEndDate() != null ? order.getEndDate() : LocalDate.now());
        order.setRevisionRequest(null);

        String comment = dto != null ? normalizeOptionalText(dto.getComment()) : null;
        Order savedOrder = orderRepository.save(order);
        logActivity(
                savedOrder,
                savedOrder.getClient(),
                MissionActivityType.CLIENT_ACCEPTED,
                "Livraison validee par le client",
                comment != null ? comment : "Paiement marque comme libere.");
        return mapToOrderDto(savedOrder);
    }

    @Transactional
    public OrderDto requestRevision(Long orderId, Long clientId, OrderClientDecisionDto dto) {
        Order order = findClientOrder(orderId, clientId);
        if (order.getStatus() != OrderStatus.DELIVERED && order.getStatus() != OrderStatus.WAITING_CLIENT) {
            throw new BusinessException("Une revision ne peut etre demandee qu'apres une livraison.", HttpStatus.BAD_REQUEST);
        }

        String comment = dto != null ? normalizeOptionalText(dto.getComment()) : null;
        if (comment == null) {
            throw new BusinessException("Le motif de revision est obligatoire.", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(OrderStatus.REVISION);
        order.setRevisionRequest(comment);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setProgressPercentage(Math.max(70, Math.min(safeProgress(order.getProgressPercentage()), 95)));

        Order savedOrder = orderRepository.save(order);
        logActivity(
                savedOrder,
                savedOrder.getClient(),
                MissionActivityType.REVISION_REQUESTED,
                "Revision demandee",
                comment);
        return mapToOrderDto(savedOrder);
    }

    private OrderRequestDto mapToRequestDto(OrderRequest request) {
        return OrderRequestDto.builder()
                .id(request.getId())
                .serviceId(request.getService().getId())
                .serviceTitle(request.getService().getTitle())
                .clientId(request.getClient().getId())
                .clientEmail(request.getClient().getEmail())
                .initialMessage(request.getMessage())
                .proposedPrice(request.getProposedBudget())
                .proposedDate(request.getProposedDate())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .build();
    }

    private OrderDto mapToOrderDto(Order order) {
        Review review = reviewRepository.findByOrder_Id(order.getId()).orElse(null);

        // Handle orders from demand-driven flow (no service, has proposal)
        String serviceTitle = null;
        Long serviceId = null;
        if (order.getService() != null) {
            serviceTitle = order.getService().getTitle();
            serviceId = order.getService().getId();
        } else if (order.getProposal() != null && order.getProposal().getServiceRequest() != null) {
            serviceTitle = order.getProposal().getServiceRequest().getTitle();
        }

        return OrderDto.builder()
                .id(order.getId())
                .serviceId(serviceId)
                .serviceTitle(serviceTitle)
                .clientId(order.getClient().getId())
                .clientEmail(order.getClient().getEmail())
                .freelancerId(order.getFreelancer().getUser().getId())
                .freelancerEmail(order.getFreelancer().getUser().getEmail())
                .amount(order.getAgreedPrice())
                .status(order.getStatus())
                .progressPercentage(safeProgress(order.getProgressPercentage()))
                .paymentStatus(order.getPaymentStatus())
                .requestMessage(order.getRequest() != null ? order.getRequest().getMessage() : null)
                .startDate(order.getStartDate())
                .endDate(order.getEndDate())
                .dueDate(order.getDueDate())
                .notes(order.getNotes())
                .deliveryNote(order.getDeliveryNote())
                .revisionRequest(order.getRevisionRequest())
                .deliveredAt(order.getDeliveredAt())
                .attachments(safeList(attachmentRepository.findByOrder_IdOrderByCreatedAtAsc(order.getId()))
                        .stream()
                        .map(AttachmentDto::from)
                        .toList())
                .milestones(safeList(missionMilestoneRepository.findByOrder_IdOrderBySortOrderAscCreatedAtAsc(order.getId()))
                        .stream()
                        .map(this::mapToMilestoneDto)
                        .toList())
                .activities(safeList(missionActivityRepository.findByOrder_IdOrderByCreatedAtDesc(order.getId()))
                        .stream()
                        .map(this::mapToActivityDto)
                        .toList())
                .reviewId(review != null ? review.getId() : null)
                .reviewRating(review != null ? review.getRating() : null)
                .reviewQualityRating(review != null ? firstNonNull(review.getQualityRating(), review.getRating()) : null)
                .reviewPunctualityRating(review != null ? firstNonNull(review.getPunctualityRating(), review.getRating()) : null)
                .reviewCommunicationRating(review != null ? firstNonNull(review.getCommunicationRating(), review.getRating()) : null)
                .reviewComment(review != null ? review.getComment() : null)
                .reviewUpdatedAt(review != null ? review.getUpdatedAt() : null)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    private MissionMilestoneDto mapToMilestoneDto(MissionMilestone milestone) {
        return MissionMilestoneDto.builder()
                .id(milestone.getId())
                .title(milestone.getTitle())
                .description(milestone.getDescription())
                .amount(milestone.getAmount())
                .deadline(milestone.getDeadline())
                .status(milestone.getStatus())
                .sortOrder(milestone.getSortOrder())
                .createdAt(milestone.getCreatedAt())
                .updatedAt(milestone.getUpdatedAt())
                .build();
    }

    private MissionActivityDto mapToActivityDto(MissionActivity activity) {
        User actor = activity.getActor();
        return MissionActivityDto.builder()
                .id(activity.getId())
                .type(activity.getType())
                .title(activity.getTitle())
                .details(activity.getDetails())
                .actorUserId(actor != null ? actor.getId() : null)
                .actorEmail(actor != null ? actor.getEmail() : null)
                .progressSnapshot(activity.getProgressSnapshot())
                .statusSnapshot(activity.getStatusSnapshot())
                .createdAt(activity.getCreatedAt())
                .build();
    }

    private Order findClientOrder(Long orderId, Long clientId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        if (!order.getClient().getId().equals(clientId)) {
            throw new UnauthorizedException("Acces refuse");
        }
        return order;
    }

    private void ensureFreelancerOwnsOrder(Order order, Long freelancerId) {
        if (!order.getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Acces refuse");
        }
    }

    private void ensureMissionCanBeUpdated(Order order) {
        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new BusinessException("Cette mission est deja cloturee.", HttpStatus.BAD_REQUEST);
        }
    }

    private BigDecimal resolveAgreedPrice(OrderRequest request) {
        if (request.getProposedBudget() != null) {
            return request.getProposedBudget();
        }
        return request.getService().getPrice() != null ? request.getService().getPrice() : BigDecimal.ZERO;
    }

    private void createDefaultMilestones(Order order) {
        if (missionMilestoneRepository.countByOrder_Id(order.getId()) > 0) {
            return;
        }

        BigDecimal amount = order.getAgreedPrice() != null ? order.getAgreedPrice() : BigDecimal.ZERO;
        missionMilestoneRepository.save(MissionMilestone.builder()
                .order(order)
                .title("Cadrage")
                .description("Clarification du besoin, livrables et planning.")
                .amount(splitAmount(amount, "0.20"))
                .deadline(order.getDueDate())
                .status(MissionMilestoneStatus.PENDING)
                .sortOrder(1)
                .build());
        missionMilestoneRepository.save(MissionMilestone.builder()
                .order(order)
                .title("Execution")
                .description("Production principale de la mission.")
                .amount(splitAmount(amount, "0.60"))
                .deadline(order.getDueDate())
                .status(MissionMilestoneStatus.PENDING)
                .sortOrder(2)
                .build());
        missionMilestoneRepository.save(MissionMilestone.builder()
                .order(order)
                .title("Livraison et validation")
                .description("Livraison finale, retour client et paiement.")
                .amount(splitAmount(amount, "0.20"))
                .deadline(order.getDueDate())
                .status(MissionMilestoneStatus.PENDING)
                .sortOrder(3)
                .build());
    }

    private BigDecimal splitAmount(BigDecimal amount, String ratio) {
        return amount.multiply(new BigDecimal(ratio)).setScale(2, RoundingMode.HALF_UP);
    }

    private void logActivity(Order order, User actor, MissionActivityType type, String title, String details) {
        missionActivityRepository.save(MissionActivity.builder()
                .order(order)
                .actor(actor)
                .type(type)
                .title(title)
                .details(details)
                .progressSnapshot(safeProgress(order.getProgressPercentage()))
                .statusSnapshot(order.getStatus())
                .build());
    }

    private MissionActivityType resolveFreelancerActivityType(
            OrderStatus previousStatus,
            OrderStatus nextStatus,
            Integer previousProgress,
            Integer nextProgress
    ) {
        if (nextStatus == OrderStatus.DELIVERED || nextStatus == OrderStatus.WAITING_CLIENT) {
            return MissionActivityType.DELIVERY_SUBMITTED;
        }
        if (nextStatus == OrderStatus.IN_PROGRESS && previousStatus != OrderStatus.IN_PROGRESS) {
            return MissionActivityType.STARTED;
        }
        if (nextStatus == OrderStatus.CANCELLED) {
            return MissionActivityType.CANCELLED;
        }
        if (nextStatus == OrderStatus.DISPUTED) {
            return MissionActivityType.DISPUTED;
        }
        if (!nextStatus.equals(previousStatus)) {
            return MissionActivityType.STATUS_CHANGED;
        }
        if (!nextProgress.equals(previousProgress)) {
            return MissionActivityType.PROGRESS_UPDATED;
        }
        return MissionActivityType.STATUS_CHANGED;
    }

    private String resolveFreelancerActivityTitle(OrderStatus status) {
        return switch (status) {
            case IN_PROGRESS -> "Mission demarree";
            case WAITING_CLIENT -> "En attente du client";
            case DELIVERED -> "Livraison envoyee";
            case REVISION -> "Revision en cours";
            case COMPLETED -> "Mission terminee";
            case CANCELLED -> "Mission annulee";
            case DISPUTED -> "Litige ouvert";
            default -> "Suivi mis a jour";
        };
    }

    private String resolveFreelancerActivityDetails(OrderExecutionUpdateDto dto, OrderStatus status) {
        if (dto.getDeliveryNote() != null && !dto.getDeliveryNote().isBlank()) {
            return dto.getDeliveryNote().trim();
        }
        if (dto.getNotes() != null && !dto.getNotes().isBlank()) {
            return dto.getNotes().trim();
        }
        return "Statut: " + status.name();
    }

    private int resolveProgressForStatus(OrderStatus status, Integer currentProgress) {
        int current = safeProgress(currentProgress);
        return switch (status) {
            case PENDING -> Math.max(current, 5);
            case ACCEPTED -> Math.max(current, 15);
            case IN_PROGRESS -> Math.max(current, 30);
            case WAITING_CLIENT -> Math.max(current, 75);
            case DELIVERED -> Math.max(current, 90);
            case REVISION -> Math.max(current, 70);
            case COMPLETED -> 100;
            case CANCELLED, DISPUTED -> current;
        };
    }

    private int safeProgress(Integer progress) {
        return progress == null ? 0 : progress;
    }

    private void validateProgress(int progress) {
        if (progress < 0 || progress > 100) {
            throw new BusinessException("La progression doit etre comprise entre 0 et 100.", HttpStatus.BAD_REQUEST);
        }
    }

    private String normalizeRequestMessage(String value) {
        String normalizedValue = normalizeRequiredText(value, "Le message de demande est obligatoire.");
        if (normalizedValue.length() < 5) {
            throw new BusinessException("Le message doit contenir au moins 5 caracteres.", HttpStatus.BAD_REQUEST);
        }
        return normalizedValue;
    }

    private String normalizeRequiredText(String value, String errorMessage) {
        String normalizedValue = normalizeOptionalText(value);
        if (normalizedValue == null) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }
        return normalizedValue;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String normalizedValue = value.trim();
        return normalizedValue.isEmpty() ? null : normalizedValue;
    }

    private <T> List<T> safeList(List<T> values) {
        return values != null ? values : List.of();
    }

    private Integer firstNonNull(Integer primaryValue, Integer fallbackValue) {
        return primaryValue != null ? primaryValue : fallbackValue;
    }
}

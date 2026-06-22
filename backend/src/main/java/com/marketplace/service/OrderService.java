package com.marketplace.service;

import com.marketplace.enums.MissionActivityType;
import com.marketplace.enums.MissionMilestoneStatus;
import com.marketplace.enums.OrderStatus;
import com.marketplace.enums.PaymentStatus;
import com.marketplace.enums.RequestStatus;
import com.marketplace.model.Attachment;
import com.marketplace.model.FreelancerProfile;
import com.marketplace.model.MissionActivity;
import com.marketplace.model.MissionMilestone;
import com.marketplace.model.Order;
import com.marketplace.model.OrderRequest;
import com.marketplace.model.Review;
import com.marketplace.model.ServiceEntity;
import com.marketplace.model.User;
import com.marketplace.persistence.AttachmentRepository;
import com.marketplace.persistence.FreelancerProfileRepository;
import com.marketplace.persistence.MissionActivityRepository;
import com.marketplace.persistence.MissionMilestoneRepository;
import com.marketplace.persistence.OrderRepository;
import com.marketplace.persistence.OrderRequestRepository;
import com.marketplace.persistence.ReviewRepository;
import com.marketplace.persistence.ServiceRepository;
import com.marketplace.persistence.UserRepository;
import com.marketplace.dto.attachment.AttachmentDto;
import com.marketplace.dto.order.AdminDisputeDecisionDto;
import com.marketplace.dto.order.MissionActivityDto;
import com.marketplace.dto.order.MissionMilestoneDto;
import com.marketplace.dto.order.OrderClientDecisionDto;
import com.marketplace.dto.order.OrderDisputeRequestDto;
import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderExecutionUpdateDto;
import com.marketplace.dto.order.OrderRequestDto;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
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
    private final FeeService feeService;

    /**
     * Liste les demandes directes recues par un freelance depuis ses services.
     */
    public List<OrderRequestDto> getIncomingRequests(Long freelancerId) {
        return orderRequestRepository.findByService_Freelancer_User_Id(freelancerId)
                .stream()
                .map(this::mapToRequestDto)
                .collect(Collectors.toList());
    }

    /**
     * Accepte une demande directe, cree la commande et initialise ses jalons.
     */
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
                .paymentStatus(PaymentStatus.PENDING)
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

    /**
     * Refuse une demande directe adressee au freelance.
     */
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

    /**
     * Recupere les commandes associees au profil freelance connecte.
     */
    public List<OrderDto> getFreelancerOrders(Long freelancerId) {
        FreelancerProfile freelancer = freelancerProfileRepository.findByUserId(freelancerId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));
        return orderRepository.findByFreelancer(freelancer)
                .stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    /**
     * Met a jour le suivi d'execution d'une mission cote freelance.
     */
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
        if (nextStatus == OrderStatus.DISPUTED) {
            throw new BusinessException("Utilisez le flux de litige pour ouvrir une reclamation avec un motif.", HttpStatus.BAD_REQUEST);
        }
        if (requiresHeldEscrowForFreelancerUpdate(nextStatus)) {
            ensureEscrowIsHeld(order);
        }

        LocalDate nextStartDate = dto.getStartDate() != null ? dto.getStartDate() : order.getStartDate();
        LocalDate nextEndDate = dto.getEndDate() != null ? dto.getEndDate() : order.getEndDate();
        LocalDate nextDueDate = dto.getDueDate() != null ? dto.getDueDate() : order.getDueDate();

        if (nextStatus == OrderStatus.IN_PROGRESS && nextStartDate == null) {
            nextStartDate = LocalDate.now();
        }

        if (nextStatus == OrderStatus.COMPLETED && nextEndDate == null) {
            nextEndDate = LocalDate.now();
        }

        if (nextStartDate != null && nextEndDate != null && nextEndDate.isBefore(nextStartDate)) {
            throw new BusinessException("La date de fin doit etre posterieure a la date de debut.", HttpStatus.BAD_REQUEST);
        }
        validateMissionDatesNotBeforeCreation(order, nextStartDate, nextEndDate, nextDueDate);

        int nextProgress = dto.getProgressPercentage() != null
                ? dto.getProgressPercentage()
                : resolveProgressForStatus(nextStatus, previousProgress);
        validateProgress(nextProgress);

        order.setStatus(nextStatus);
        order.setProgressPercentage(nextProgress);
        order.setStartDate(nextStartDate);
        order.setEndDate(nextEndDate);
        order.setDueDate(nextDueDate);

        if (dto.getNotes() != null) {
            order.setNotes(normalizeOptionalText(dto.getNotes()));
        }

        if (dto.getDeliveryNote() != null) {
            order.setDeliveryNote(normalizeOptionalText(dto.getDeliveryNote()));
        }

        if (nextStatus == OrderStatus.DELIVERED || nextStatus == OrderStatus.WAITING_CLIENT) {
            order.setPaymentStatus(PaymentStatus.HELD);
            order.setDeliveredAt(LocalDateTime.now());
            moveClientValidationMilestoneToWaitingClient(order);
        }

        if (nextStatus == OrderStatus.COMPLETED) {
            order.setProgressPercentage(100);
            order.setPaymentStatus(PaymentStatus.RELEASED);
        }

        if (nextStatus == OrderStatus.CANCELLED && isEscrowHeld(order)) {
            order.setPaymentStatus(PaymentStatus.REFUNDED);
        }

        Order savedOrder = orderRepository.save(order);
        createFeeForReleasedPayment(savedOrder);
        logActivity(
                savedOrder,
                savedOrder.getFreelancer().getUser(),
                resolveFreelancerActivityType(previousStatus, nextStatus, previousProgress, safeProgress(savedOrder.getProgressPercentage())),
                resolveFreelancerActivityTitle(nextStatus),
                resolveFreelancerActivityDetails(dto, nextStatus));
        return mapToOrderDto(savedOrder);
    }

    /**
     * Ajoute un jalon de mission et recalcule l'avancement global.
     */
    @Transactional
    public MissionMilestoneDto addMissionMilestone(Long orderId, Long freelancerId, MissionMilestoneDto dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        ensureFreelancerOwnsOrder(order, freelancerId);
        ensureMissionCanBeUpdated(order);
        if (dto.getStatus() != null && dto.getStatus() != MissionMilestoneStatus.PENDING) {
            ensureEscrowIsHeld(order);
        }
        validateMissionDateNotBeforeCreation(order, dto.getDeadline(), "La date du jalon");

        MissionMilestone milestone = MissionMilestone.builder()
                .order(order)
                .title(normalizeRequiredText(dto.getTitle(), "Le titre du jalon est obligatoire."))
                .description(normalizeOptionalText(dto.getDescription()))
                .amount(dto.getAmount())
                .deadline(dto.getDeadline())
                .timerDurationMinutes(normalizeTimerDuration(dto.getTimerDurationMinutes()))
                .timerStartedAt(dto.getTimerStartedAt())
                .timerCompletedAt(dto.getTimerCompletedAt())
                .status(dto.getStatus() != null ? dto.getStatus() : MissionMilestoneStatus.PENDING)
                .sortOrder(dto.getSortOrder() != null
                        ? dto.getSortOrder()
                        : (int) missionMilestoneRepository.countByOrder_Id(orderId) + 1)
                .build();
        applyMilestoneTimerState(milestone);

        MissionMilestone savedMilestone = missionMilestoneRepository.save(milestone);
        refreshOrderProgressFromMilestones(order);
        logActivity(
                order,
                order.getFreelancer().getUser(),
                MissionActivityType.MILESTONE_UPDATED,
                "Jalon ajoute",
                savedMilestone.getTitle());
        return mapToMilestoneDto(savedMilestone);
    }

    /**
     * Met a jour un jalon existant et synchronise le statut de la commande si besoin.
     */
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
            validateMissionDateNotBeforeCreation(order, dto.getDeadline(), "La date du jalon");
            milestone.setDeadline(dto.getDeadline());
        }
        if (dto.getTimerDurationMinutes() != null) {
            milestone.setTimerDurationMinutes(normalizeTimerDuration(dto.getTimerDurationMinutes()));
        }
        if (dto.getTimerStartedAt() != null) {
            milestone.setTimerStartedAt(dto.getTimerStartedAt());
        }
        if (dto.getTimerCompletedAt() != null) {
            milestone.setTimerCompletedAt(dto.getTimerCompletedAt());
        }
        if (dto.getStatus() == MissionMilestoneStatus.COMPLETED && isClientValidatedMilestone(order, milestone)) {
            throw new BusinessException("La phase de livraison doit etre terminee par le client apres verification.", HttpStatus.BAD_REQUEST);
        }
        if (dto.getStatus() == MissionMilestoneStatus.IN_PROGRESS
                || dto.getStatus() == MissionMilestoneStatus.COMPLETED
                || dto.getStatus() == MissionMilestoneStatus.WAITING_CLIENT) {
            ensureEscrowIsHeld(order);
        }
        if (dto.getStatus() != null) {
            milestone.setStatus(dto.getStatus());
        }
        if (dto.getSortOrder() != null) {
            milestone.setSortOrder(dto.getSortOrder());
        }
        applyMilestoneTimerState(milestone);
        startOrderFromMilestoneIfNeeded(order, milestone);

        MissionMilestone savedMilestone = missionMilestoneRepository.save(milestone);
        refreshOrderProgressFromMilestones(order);
        logActivity(
                order,
                order.getFreelancer().getUser(),
                MissionActivityType.MILESTONE_UPDATED,
                "Jalon mis a jour",
                savedMilestone.getTitle() + " - " + savedMilestone.getStatus());
        return mapToMilestoneDto(savedMilestone);
    }

    /**
     * Cree une demande directe d'un client vers un service freelance.
     */
    @Transactional
    public OrderRequestDto createOrderRequest(Long clientId, OrderRequestDto dto) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));
        ServiceEntity service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));

        if (orderRequestRepository.existsByClient_IdAndService(clientId, service)) {
            throw new BusinessException("Une demande existe deja pour ce service.", HttpStatus.CONFLICT);
        }
        validateRequestedDateNotInPast(dto.getProposedDate());

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

    /**
     * Recupere les commandes creees par le client connecte.
     */
    public List<OrderDto> getClientOrders(Long clientId) {
        return orderRepository.findByClient_Id(clientId)
                .stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    /**
     * Simule le blocage du paiement en escrow avant execution avancee de la mission.
     */
    @Transactional
    public OrderDto confirmEscrowPayment(Long orderId, Long clientId) {
        Order order = findClientOrder(orderId, clientId);
        if (order.getStatus() == OrderStatus.COMPLETED
                || order.getStatus() == OrderStatus.CANCELLED
                || order.getStatus() == OrderStatus.DISPUTED) {
            throw new BusinessException("Le paiement simule ne peut pas etre bloque pour une mission cloturee.", HttpStatus.BAD_REQUEST);
        }
        if (isPaymentReleased(order) || order.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new BusinessException("Cette mission a deja un paiement finalise.", HttpStatus.BAD_REQUEST);
        }
        if (isEscrowHeld(order)) {
            return mapToOrderDto(order);
        }

        order.setPaymentStatus(PaymentStatus.HELD);
        Order savedOrder = orderRepository.save(order);
        logActivity(
                savedOrder,
                savedOrder.getClient(),
                MissionActivityType.PAYMENT_UPDATED,
                "Paiement simule bloque",
                "Les fonds virtuels sont bloques en escrow jusqu'a validation de la livraison.");
        return mapToOrderDto(savedOrder);
    }

    /**
     * Valide la livraison, libere le paiement simule et termine la mission.
     */
    @Transactional
    public OrderDto acceptDelivery(Long orderId, Long clientId, OrderClientDecisionDto dto) {
        Order order = findClientOrder(orderId, clientId);
        if (!isClientDeliveryReviewable(order)) {
            throw new BusinessException("La mission doit etre livree avant validation client.", HttpStatus.BAD_REQUEST);
        }
        ensureEscrowIsHeld(order);

        order.setStatus(OrderStatus.COMPLETED);
        order.setProgressPercentage(100);
        order.setPaymentStatus(PaymentStatus.RELEASED);
        order.setEndDate(order.getEndDate() != null ? order.getEndDate() : LocalDate.now());
        order.setRevisionRequest(null);
        completeClientValidationMilestone(order);

        String comment = dto != null ? normalizeOptionalText(dto.getComment()) : null;
        Order savedOrder = orderRepository.save(order);
        createFeeForReleasedPayment(savedOrder);
        logActivity(
                savedOrder,
                savedOrder.getClient(),
                MissionActivityType.CLIENT_ACCEPTED,
                "Livraison validee par le client",
                comment != null ? comment : "Paiement marque comme libere.");
        return mapToOrderDto(savedOrder);
    }

    /**
     * Demande une revision apres livraison en conservant le paiement en escrow.
     */
    @Transactional
    public OrderDto requestRevision(Long orderId, Long clientId, OrderClientDecisionDto dto) {
        Order order = findClientOrder(orderId, clientId);
        if (!isClientDeliveryReviewable(order)) {
            throw new BusinessException("Une revision ne peut etre demandee qu'apres une livraison.", HttpStatus.BAD_REQUEST);
        }
        ensureEscrowIsHeld(order);

        String comment = dto != null ? normalizeOptionalText(dto.getComment()) : null;
        if (comment == null) {
            throw new BusinessException("Le motif de revision est obligatoire.", HttpStatus.BAD_REQUEST);
        }
        if (safeRevisionCount(order.getRevisionCount()) >= safeMaxRevisionRounds(order.getMaxRevisionRounds())) {
            throw new BusinessException("Le nombre maximum de revisions est atteint pour cette mission.", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(OrderStatus.REVISION);
        order.setRevisionRequest(comment);
        order.setRevisionCount(safeRevisionCount(order.getRevisionCount()) + 1);
        order.setPaymentStatus(PaymentStatus.HELD);
        order.setProgressPercentage(Math.max(70, Math.min(safeProgress(order.getProgressPercentage()), 95)));
        moveClientValidationMilestoneToRevision(order);

        Order savedOrder = orderRepository.save(order);
        logActivity(
                savedOrder,
                savedOrder.getClient(),
                MissionActivityType.REVISION_REQUESTED,
                "Revision demandee",
                comment);
        return mapToOrderDto(savedOrder);
    }

    /**
     * Ouvre un litige a l'initiative du client.
     */
    @Transactional
    public OrderDto openClientDispute(Long orderId, Long clientId, OrderDisputeRequestDto dto) {
        Order order = findClientOrder(orderId, clientId);
        return openDispute(order, order.getClient(), dto);
    }

    /**
     * Ouvre un litige a l'initiative du freelance.
     */
    @Transactional
    public OrderDto openFreelancerDispute(Long orderId, Long freelancerId, OrderDisputeRequestDto dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        ensureFreelancerOwnsOrder(order, freelancerId);
        return openDispute(order, order.getFreelancer().getUser(), dto);
    }

    /**
     * Applique la decision admin sur un litige et cloture la commande selon la resolution.
     */
    @Transactional
    public OrderDto resolveAdminDispute(Long orderId, Long adminId, AdminDisputeDecisionDto dto) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        if (order.getStatus() != OrderStatus.DISPUTED) {
            throw new BusinessException("Cette mission n'a pas de litige ouvert.", HttpStatus.BAD_REQUEST);
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Administrateur introuvable"));
        String action = normalizeRequiredText(dto != null ? dto.getAction() : null, "L'action d'arbitrage est obligatoire.")
                .toUpperCase();
        String adminNotes = normalizeOptionalText(dto != null ? dto.getAdminNotes() : null);

        switch (action) {
            case "ARBITRATE" -> {
                if (adminNotes == null) {
                    throw new BusinessException("Les notes d'arbitrage sont obligatoires.", HttpStatus.BAD_REQUEST);
                }
                order.setDisputeAdminNotes(adminNotes);
                order.setDisputeResolution("ARBITRATED");
                Order savedOrder = orderRepository.save(order);
                logActivity(savedOrder, admin, MissionActivityType.DISPUTED, "Arbitrage admin", adminNotes);
                return mapToOrderDto(savedOrder);
            }
            case "REFUND" -> {
                order.setStatus(OrderStatus.CANCELLED);
                order.setPaymentStatus(PaymentStatus.REFUNDED);
                order.setEndDate(order.getEndDate() != null ? order.getEndDate() : LocalDate.now());
                order.setDisputeAdminNotes(adminNotes);
                order.setDisputeResolution("REFUNDED");
                order.setDisputeResolvedAt(LocalDateTime.now());
                Order savedOrder = orderRepository.save(order);
                logActivity(savedOrder, admin, MissionActivityType.PAYMENT_UPDATED, "Remboursement admin",
                        adminNotes != null ? adminNotes : "Paiement rembourse apres arbitrage.");
                return mapToOrderDto(savedOrder);
            }
            case "CLOSE" -> {
                order.setStatus(OrderStatus.COMPLETED);
                order.setProgressPercentage(100);
                order.setPaymentStatus(PaymentStatus.RELEASED);
                order.setEndDate(order.getEndDate() != null ? order.getEndDate() : LocalDate.now());
                order.setDisputeAdminNotes(adminNotes);
                order.setDisputeResolution("CLOSED");
                order.setDisputeResolvedAt(LocalDateTime.now());
                completeClientValidationMilestone(order);
                Order savedOrder = orderRepository.save(order);
                createFeeForReleasedPayment(savedOrder);
                logActivity(savedOrder, admin, MissionActivityType.DISPUTED, "Litige cloture",
                        adminNotes != null ? adminNotes : "Mission cloturee apres arbitrage.");
                return mapToOrderDto(savedOrder);
            }
            default -> throw new BusinessException("Action de litige invalide.", HttpStatus.BAD_REQUEST);
        }
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
                .feePercentage(order.getFee() != null ? order.getFee().getFeePercentage() : null)
                .feeAmount(order.getFee() != null ? order.getFee().getFeeAmount() : null)
                .freelancerAmount(order.getFee() != null ? order.getFee().getFreelancerAmount() : null)
                .feeCreatedAt(order.getFee() != null ? order.getFee().getCreatedAt() : null)
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
                .revisionCount(safeRevisionCount(order.getRevisionCount()))
                .maxRevisionRounds(safeMaxRevisionRounds(order.getMaxRevisionRounds()))
                .deliveredAt(order.getDeliveredAt())
                .disputeReason(order.getDisputeReason())
                .disputeAdminNotes(order.getDisputeAdminNotes())
                .disputeOpenedById(order.getDisputeOpenedBy() != null ? order.getDisputeOpenedBy().getId() : null)
                .disputeOpenedByEmail(order.getDisputeOpenedBy() != null ? order.getDisputeOpenedBy().getEmail() : null)
                .disputeOpenedAt(order.getDisputeOpenedAt())
                .disputeResolvedAt(order.getDisputeResolvedAt())
                .disputeResolution(order.getDisputeResolution())
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
                .timerDurationMinutes(milestone.getTimerDurationMinutes())
                .timerStartedAt(milestone.getTimerStartedAt())
                .timerCompletedAt(milestone.getTimerCompletedAt())
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

    private boolean isClientDeliveryReviewable(Order order) {
        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.WAITING_CLIENT) {
            return true;
        }
        if (order.getStatus() == OrderStatus.COMPLETED
                || order.getStatus() == OrderStatus.CANCELLED
                || order.getStatus() == OrderStatus.DISPUTED) {
            return false;
        }
        if (order.getStatus() == OrderStatus.REVISION) {
            return hasFreshDeliveryAfterLatestRevision(order);
        }

        MissionMilestone validationMilestone = findClientValidationMilestone(order);
        boolean validationIsWaitingClient = validationMilestone != null
                && validationMilestone.getStatus() == MissionMilestoneStatus.WAITING_CLIENT;

        return normalizeOptionalText(order.getDeliveryNote()) != null
                || order.getDeliveredAt() != null
                || validationIsWaitingClient
                || hasDeliveryAttachment(order);
    }

    private boolean hasFreshDeliveryAfterLatestRevision(Order order) {
        LocalDateTime latestRevisionAt = findLatestActivityCreatedAt(order, MissionActivityType.REVISION_REQUESTED);
        if (latestRevisionAt == null) {
            return hasDeliveryEvidence(order);
        }

        LocalDateTime latestDeliveryActivityAt = findLatestActivityCreatedAt(order, MissionActivityType.DELIVERY_SUBMITTED);
        boolean hasDeliveryActivityAfterRevision = isSameOrAfter(latestDeliveryActivityAt, latestRevisionAt);
        boolean hasDeliveredAtAfterRevision = isSameOrAfter(order.getDeliveredAt(), latestRevisionAt);
        boolean hasUpdatedDeliveryNoteAfterRevision = normalizeOptionalText(order.getDeliveryNote()) != null
                && isSameOrAfter(order.getUpdatedAt(), latestRevisionAt);
        List<Attachment> deliveryAttachments = safeList(attachmentRepository.findByOrder_IdOrderByCreatedAtAsc(order.getId()))
                .stream()
                .filter(this::isClientReviewEvidenceAttachment)
                .toList();
        boolean hasDeliveryAttachmentAfterRevision = deliveryAttachments.stream()
                .map(Attachment::getCreatedAt)
                .anyMatch(createdAt -> createdAt == null || isSameOrAfter(createdAt, latestRevisionAt));

        return hasDeliveryActivityAfterRevision
                || hasDeliveredAtAfterRevision
                || hasUpdatedDeliveryNoteAfterRevision
                || hasDeliveryAttachmentAfterRevision;
    }

    private boolean hasDeliveryEvidence(Order order) {
        return normalizeOptionalText(order.getDeliveryNote()) != null
                || order.getDeliveredAt() != null
                || hasClientReviewEvidenceAttachment(order);
    }

    private LocalDateTime findLatestActivityCreatedAt(Order order, MissionActivityType type) {
        return safeList(missionActivityRepository.findByOrder_IdOrderByCreatedAtDesc(order.getId()))
                .stream()
                .filter(activity -> activity != null && activity.getType() == type)
                .map(MissionActivity::getCreatedAt)
                .filter(createdAt -> createdAt != null)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private boolean isSameOrAfter(LocalDateTime value, LocalDateTime reference) {
        return value != null && reference != null && !value.isBefore(reference);
    }

    private boolean hasDeliveryAttachment(Order order) {
        return safeList(attachmentRepository.findByOrder_IdOrderByCreatedAtAsc(order.getId()))
                .stream()
                .anyMatch(this::isDeliveryAttachment);
    }

    private boolean hasClientReviewEvidenceAttachment(Order order) {
        return safeList(attachmentRepository.findByOrder_IdOrderByCreatedAtAsc(order.getId()))
                .stream()
                .anyMatch(this::isClientReviewEvidenceAttachment);
    }

    private boolean isDeliveryAttachment(Attachment attachment) {
        return attachment != null && "DELIVERY_PROOF".equalsIgnoreCase(attachment.getAttachmentType());
    }

    private boolean isClientReviewEvidenceAttachment(Attachment attachment) {
        return attachment != null
                && ("DELIVERY_PROOF".equalsIgnoreCase(attachment.getAttachmentType())
                || "REVISION_FILE".equalsIgnoreCase(attachment.getAttachmentType()));
    }

    private void ensureFreelancerOwnsOrder(Order order, Long freelancerId) {
        if (!order.getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Acces refuse");
        }
    }

    private void ensureMissionCanBeUpdated(Order order) {
        if (order.getStatus() == OrderStatus.COMPLETED
                || order.getStatus() == OrderStatus.CANCELLED
                || order.getStatus() == OrderStatus.DISPUTED) {
            throw new BusinessException("Cette mission est deja cloturee.", HttpStatus.BAD_REQUEST);
        }
    }

    private OrderDto openDispute(Order order, User opener, OrderDisputeRequestDto dto) {
        ensureMissionCanBeDisputed(order);
        String reason = normalizeRequiredText(dto != null ? dto.getReason() : null, "Le motif du litige est obligatoire.");
        if (reason.length() < 10) {
            throw new BusinessException("Le motif du litige doit contenir au moins 10 caracteres.", HttpStatus.BAD_REQUEST);
        }

        order.setStatus(OrderStatus.DISPUTED);
        if (!isPaymentReleased(order) && order.getPaymentStatus() != PaymentStatus.REFUNDED) {
            order.setPaymentStatus(PaymentStatus.HELD);
        }
        order.setDisputeReason(reason);
        order.setDisputeAdminNotes(null);
        order.setDisputeOpenedBy(opener);
        order.setDisputeOpenedAt(LocalDateTime.now());
        order.setDisputeResolvedAt(null);
        order.setDisputeResolution(null);

        Order savedOrder = orderRepository.save(order);
        logActivity(savedOrder, opener, MissionActivityType.DISPUTED, "Litige ouvert", reason);
        return mapToOrderDto(savedOrder);
    }

    private void ensureMissionCanBeDisputed(Order order) {
        if (order.getStatus() == OrderStatus.DISPUTED) {
            throw new BusinessException("Un litige est deja ouvert pour cette mission.", HttpStatus.CONFLICT);
        }
        if (order.getStatus() == OrderStatus.COMPLETED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new BusinessException("Une mission cloturee ne peut plus passer en litige.", HttpStatus.BAD_REQUEST);
        }
    }

    private void ensureEscrowIsHeld(Order order) {
        if (!isEscrowHeld(order) && !isPaymentReleased(order)) {
            throw new BusinessException("Le client doit d'abord bloquer le paiement simule en escrow.", HttpStatus.BAD_REQUEST);
        }
    }

    private boolean requiresHeldEscrowForFreelancerUpdate(OrderStatus status) {
        return status == OrderStatus.IN_PROGRESS
                || status == OrderStatus.WAITING_CLIENT
                || status == OrderStatus.DELIVERED
                || status == OrderStatus.REVISION
                || status == OrderStatus.COMPLETED;
    }

    private boolean isEscrowHeld(Order order) {
        return order.getPaymentStatus() == PaymentStatus.HELD;
    }

    private boolean isPaymentReleased(Order order) {
        return order.getPaymentStatus() == PaymentStatus.RELEASED || order.getPaymentStatus() == PaymentStatus.PAID;
    }

    private void createFeeForReleasedPayment(Order order) {
        if (isPaymentReleased(order)) {
            feeService.createForReleasedOrder(order);
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
                .timerDurationMinutes(240)
                .status(MissionMilestoneStatus.PENDING)
                .sortOrder(1)
                .build());
        missionMilestoneRepository.save(MissionMilestone.builder()
                .order(order)
                .title("Execution")
                .description("Production principale de la mission.")
                .amount(splitAmount(amount, "0.60"))
                .deadline(order.getDueDate())
                .timerDurationMinutes(1440)
                .status(MissionMilestoneStatus.PENDING)
                .sortOrder(2)
                .build());
        missionMilestoneRepository.save(MissionMilestone.builder()
                .order(order)
                .title("Livraison et validation")
                .description("Livraison finale, retour client et paiement.")
                .amount(splitAmount(amount, "0.20"))
                .deadline(order.getDueDate())
                .timerDurationMinutes(240)
                .status(MissionMilestoneStatus.PENDING)
                .sortOrder(3)
                .build());
    }

    private void moveClientValidationMilestoneToWaitingClient(Order order) {
        MissionMilestone milestone = findClientValidationMilestone(order);
        if (milestone == null
                || milestone.getStatus() == MissionMilestoneStatus.COMPLETED
                || milestone.getStatus() == MissionMilestoneStatus.CANCELLED) {
            return;
        }

        milestone.setStatus(MissionMilestoneStatus.WAITING_CLIENT);
        if (milestone.getTimerStartedAt() == null) {
            milestone.setTimerStartedAt(LocalDateTime.now());
        }
        milestone.setTimerCompletedAt(null);
        missionMilestoneRepository.save(milestone);
    }

    private void completeClientValidationMilestone(Order order) {
        MissionMilestone milestone = findClientValidationMilestone(order);
        if (milestone == null || milestone.getStatus() == MissionMilestoneStatus.CANCELLED) {
            return;
        }

        milestone.setStatus(MissionMilestoneStatus.COMPLETED);
        applyMilestoneTimerState(milestone);
        missionMilestoneRepository.save(milestone);
    }

    private void moveClientValidationMilestoneToRevision(Order order) {
        MissionMilestone milestone = findClientValidationMilestone(order);
        if (milestone == null || milestone.getStatus() == MissionMilestoneStatus.CANCELLED) {
            return;
        }

        milestone.setStatus(MissionMilestoneStatus.IN_PROGRESS);
        if (milestone.getTimerStartedAt() == null) {
            milestone.setTimerStartedAt(LocalDateTime.now());
        }
        milestone.setTimerCompletedAt(null);
        missionMilestoneRepository.save(milestone);
    }

    private boolean isClientValidatedMilestone(Order order, MissionMilestone milestone) {
        MissionMilestone clientValidationMilestone = findClientValidationMilestone(order);
        return clientValidationMilestone != null
                && milestone.getId() != null
                && milestone.getId().equals(clientValidationMilestone.getId());
    }

    private MissionMilestone findClientValidationMilestone(Order order) {
        List<MissionMilestone> milestones = safeList(
                missionMilestoneRepository.findByOrder_IdOrderBySortOrderAscCreatedAtAsc(order.getId()));
        if (milestones.isEmpty()) {
            return null;
        }

        return milestones.stream()
                .filter(this::isDeliveryMilestone)
                .findFirst()
                .orElse(milestones.get(milestones.size() - 1));
    }

    private boolean isDeliveryMilestone(MissionMilestone milestone) {
        String title = milestone.getTitle() != null ? milestone.getTitle().toLowerCase() : "";
        return title.contains("livraison") || title.contains("validation");
    }

    private void applyMilestoneTimerState(MissionMilestone milestone) {
        LocalDateTime now = LocalDateTime.now();
        if (milestone.getStatus() == MissionMilestoneStatus.IN_PROGRESS && milestone.getTimerStartedAt() == null) {
            milestone.setTimerStartedAt(now);
        }
        if (milestone.getStatus() == MissionMilestoneStatus.COMPLETED) {
            if (milestone.getTimerStartedAt() == null) {
                milestone.setTimerStartedAt(now);
            }
            if (milestone.getTimerCompletedAt() == null) {
                milestone.setTimerCompletedAt(now);
            }
        }
        if (milestone.getStatus() != MissionMilestoneStatus.COMPLETED && milestone.getTimerCompletedAt() != null) {
            milestone.setTimerCompletedAt(null);
        }
    }

    private void startOrderFromMilestoneIfNeeded(Order order, MissionMilestone milestone) {
        if (order.getStatus() == OrderStatus.ACCEPTED && milestone.getStatus() == MissionMilestoneStatus.IN_PROGRESS) {
            order.setStatus(OrderStatus.IN_PROGRESS);
            if (order.getStartDate() == null) {
                order.setStartDate(LocalDate.now());
            }
        }
    }

    private void refreshOrderProgressFromMilestones(Order order) {
        List<MissionMilestone> milestones = safeList(
                missionMilestoneRepository.findByOrder_IdOrderBySortOrderAscCreatedAtAsc(order.getId()));
        if (milestones.isEmpty()) {
            return;
        }

        double completedUnits = 0;
        for (MissionMilestone milestone : milestones) {
            if (milestone.getStatus() == MissionMilestoneStatus.COMPLETED) {
                completedUnits += 1;
            } else if (milestone.getStatus() == MissionMilestoneStatus.IN_PROGRESS
                    || milestone.getStatus() == MissionMilestoneStatus.WAITING_CLIENT) {
                completedUnits += 0.5;
            }
        }

        int phaseProgress = (int) Math.round((completedUnits / milestones.size()) * 90);
        int statusProgress = resolveProgressForStatus(order.getStatus(), 0);
        int nextProgress = Math.max(statusProgress, phaseProgress);
        if (order.getStatus() == OrderStatus.COMPLETED) {
            nextProgress = 100;
        } else if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DISPUTED) {
            nextProgress = safeProgress(order.getProgressPercentage());
        }

        validateProgress(nextProgress);
        order.setProgressPercentage(nextProgress);
        orderRepository.save(order);
    }

    private Integer normalizeTimerDuration(Integer value) {
        if (value == null) {
            return null;
        }
        if (value <= 0) {
            throw new BusinessException("La duree du timer doit etre superieure a 0 minute.", HttpStatus.BAD_REQUEST);
        }
        return value;
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

    private int safeRevisionCount(Integer revisionCount) {
        return revisionCount != null ? Math.max(revisionCount, 0) : 0;
    }

    private int safeMaxRevisionRounds(Integer maxRevisionRounds) {
        return maxRevisionRounds != null ? Math.max(maxRevisionRounds, 0) : 3;
    }

    private void validateProgress(int progress) {
        if (progress < 0 || progress > 100) {
            throw new BusinessException("La progression doit etre comprise entre 0 et 100.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateMissionDatesNotBeforeCreation(
            Order order,
            LocalDate startDate,
            LocalDate endDate,
            LocalDate dueDate
    ) {
        validateMissionDateNotBeforeCreation(order, startDate, "La date de debut");
        validateMissionDateNotBeforeCreation(order, dueDate, "La date d'echeance");
        validateMissionDateNotBeforeCreation(order, endDate, "La date de fin");
    }

    private void validateMissionDateNotBeforeCreation(Order order, LocalDate value, String fieldLabel) {
        if (value == null || order.getCreatedAt() == null) {
            return;
        }

        LocalDate creationDate = order.getCreatedAt().toLocalDate();
        if (value.isBefore(creationDate)) {
            throw new BusinessException(fieldLabel + " ne peut pas etre anterieure a la creation de la mission.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validateRequestedDateNotInPast(LocalDate proposedDate) {
        if (proposedDate != null && proposedDate.isBefore(LocalDate.now())) {
            throw new BusinessException("La date proposee ne peut pas etre dans le passe.", HttpStatus.BAD_REQUEST);
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

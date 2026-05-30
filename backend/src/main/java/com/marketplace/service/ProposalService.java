package com.marketplace.service;

import com.marketplace.enums.*;
import com.marketplace.model.*;
import com.marketplace.persistence.*;
import com.marketplace.dto.request.ProposalDto;
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
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProposalService {

    private final ProposalRepository proposalRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;
    private final OrderRepository orderRepository;
    private final MissionMilestoneRepository missionMilestoneRepository;
    private final MissionActivityRepository missionActivityRepository;
    private final NotificationService notificationService;
    private final MessageService messageService;

    @Transactional
    public ProposalDto submitProposal(Long freelancerUserId, ProposalDto dto) {
        FreelancerProfile freelancer = freelancerProfileRepository.findByUserId(freelancerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));

        ServiceRequest serviceRequest = serviceRequestRepository.findById(dto.getServiceRequestId())
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));

        if (serviceRequest.getStatus() != ServiceRequestStatus.OPEN
                && serviceRequest.getStatus() != ServiceRequestStatus.IN_DISCUSSION
                && serviceRequest.getStatus() != ServiceRequestStatus.IN_PROGRESS) {
            throw new BusinessException("Cette demande n'accepte plus de candidatures.", HttpStatus.BAD_REQUEST);
        }

        if (serviceRequest.getClient().getId().equals(freelancerUserId)) {
            throw new BusinessException("Vous ne pouvez pas postuler a votre propre demande.", HttpStatus.BAD_REQUEST);
        }

        if (proposalRepository.existsByServiceRequest_IdAndFreelancer_Id(serviceRequest.getId(), freelancer.getId())) {
            throw new BusinessException("Vous avez deja postule a cette demande.", HttpStatus.CONFLICT);
        }

        String message = normalizeRequiredText(dto.getMessage(), "Le message est obligatoire.");
        if (message.length() < 5) {
            throw new BusinessException("Le message doit contenir au moins 5 caracteres.", HttpStatus.BAD_REQUEST);
        }

        if (dto.getProposedPrice() == null || dto.getProposedPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Le prix propose est obligatoire et doit etre positif.", HttpStatus.BAD_REQUEST);
        }

        if (dto.getEstimatedDays() == null || dto.getEstimatedDays() < 1) {
            throw new BusinessException("Le delai estime est obligatoire (minimum 1 jour).", HttpStatus.BAD_REQUEST);
        }

        List<String> proposedSteps = normalizeProposedSteps(dto.getProposedSteps());

        Proposal proposal = Proposal.builder()
                .serviceRequest(serviceRequest)
                .freelancer(freelancer)
                .message(message)
                .proposedPrice(dto.getProposedPrice())
                .estimatedDays(dto.getEstimatedDays())
                .proposedSteps(proposedSteps)
                .portfolioUrl(normalizeOptionalText(dto.getPortfolioUrl()))
                .status(ProposalStatus.PENDING)
                .build();

        Proposal saved = proposalRepository.save(proposal);

        // Update service request status to IN_DISCUSSION if first proposal
        if (serviceRequest.getStatus() == ServiceRequestStatus.OPEN) {
            serviceRequest.setStatus(ServiceRequestStatus.IN_DISCUSSION);
            serviceRequestRepository.save(serviceRequest);
        }

        // Notify the client
        notificationService.createNotification(
                serviceRequest.getClient().getId(),
                NotificationType.NEW_PROPOSAL,
                "Nouvelle candidature de " + freelancer.getUser().getFirstName()
                        + " pour \"" + serviceRequest.getTitle() + "\"",
                "PROPOSAL",
                saved.getId());

        return mapProposalToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ProposalDto> getProposalsForRequest(Long requestId) {
        return proposalRepository.findByServiceRequest_IdOrderByCreatedAtDesc(requestId)
                .stream()
                .map(ProposalService::mapProposalToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProposalDto> getFreelancerProposals(Long freelancerUserId) {
        return proposalRepository.findByFreelancer_User_IdOrderByCreatedAtDesc(freelancerUserId)
                .stream()
                .map(ProposalService::mapProposalToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void withdrawProposal(Long proposalId, Long freelancerUserId) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));

        if (!proposal.getFreelancer().getUser().getId().equals(freelancerUserId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        if (proposal.getStatus() != ProposalStatus.PENDING) {
            throw new BusinessException("Seules les candidatures en attente peuvent etre retirees.", HttpStatus.BAD_REQUEST);
        }

        proposal.setStatus(ProposalStatus.WITHDRAWN);
        proposalRepository.save(proposal);
    }

    @Transactional
    public ProposalDto acceptProposal(Long proposalId, Long clientId) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));

        ServiceRequest serviceRequest = proposal.getServiceRequest();
        if (!serviceRequest.getClient().getId().equals(clientId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        if (proposal.getStatus() != ProposalStatus.PENDING) {
            throw new BusinessException("Cette candidature ne peut plus etre acceptee.", HttpStatus.BAD_REQUEST);
        }

        if (serviceRequest.getStatus() == ServiceRequestStatus.COMPLETED
                || serviceRequest.getStatus() == ServiceRequestStatus.CANCELLED) {
            throw new BusinessException("Cette demande est deja cloturee.", HttpStatus.BAD_REQUEST);
        }

        // Accept the proposal
        proposal.setStatus(ProposalStatus.ACCEPTED);
        proposalRepository.save(proposal);

        // Move request to IN_PROGRESS (if not already)
        if (serviceRequest.getStatus() != ServiceRequestStatus.IN_PROGRESS) {
            serviceRequest.setStatus(ServiceRequestStatus.IN_PROGRESS);
            serviceRequestRepository.save(serviceRequest);
        }

        // Create Order from proposal
        Order order = Order.builder()
                .proposal(proposal)
                .client(serviceRequest.getClient())
                .freelancer(proposal.getFreelancer())
                .agreedPrice(proposal.getProposedPrice())
                .dueDate(serviceRequest.getDeadline())
                .status(OrderStatus.ACCEPTED)
                .progressPercentage(15)
                .paymentStatus(PaymentStatus.PENDING)
                .build();
        Order savedOrder = orderRepository.save(order);

        // Create milestones from the freelancer's custom offer when available.
        createMilestonesFromProposal(savedOrder, proposal);

        // Log activity
        missionActivityRepository.save(MissionActivity.builder()
                .order(savedOrder)
                .actor(proposal.getFreelancer().getUser())
                .type(MissionActivityType.ACCEPTED)
                .title("Mission validee")
                .details("Candidature acceptee pour \"" + serviceRequest.getTitle() + "\"")
                .progressSnapshot(15)
                .statusSnapshot(OrderStatus.ACCEPTED)
                .build());

        // Create conversation
        messageService.ensureOrderConversation(savedOrder);

        // Notify the freelancer
        notificationService.createNotification(
                proposal.getFreelancer().getUser().getId(),
                NotificationType.PROPOSAL_ACCEPTED,
                "Votre candidature pour \"" + serviceRequest.getTitle() + "\" a ete acceptee !",
                "ORDER",
                savedOrder.getId());

        return mapProposalToDto(proposal);
    }

    @Transactional
    public ProposalDto rejectProposal(Long proposalId, Long clientId) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));

        ServiceRequest serviceRequest = proposal.getServiceRequest();
        if (!serviceRequest.getClient().getId().equals(clientId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        if (proposal.getStatus() != ProposalStatus.PENDING) {
            throw new BusinessException("Cette candidature ne peut plus etre rejetee.", HttpStatus.BAD_REQUEST);
        }

        proposal.setStatus(ProposalStatus.REJECTED);
        proposalRepository.save(proposal);

        // Notify the freelancer
        notificationService.createNotification(
                proposal.getFreelancer().getUser().getId(),
                NotificationType.PROPOSAL_REJECTED,
                "Votre candidature pour \"" + serviceRequest.getTitle() + "\" n'a pas ete retenue.",
                "SERVICE_REQUEST",
                serviceRequest.getId());

        return mapProposalToDto(proposal);
    }

    @Transactional
    public void closeServiceRequest(Long requestId, Long clientId) {
        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));

        if (!serviceRequest.getClient().getId().equals(clientId)) {
            throw new UnauthorizedException("Acces refuse");
        }

        if (serviceRequest.getStatus() == ServiceRequestStatus.COMPLETED
                || serviceRequest.getStatus() == ServiceRequestStatus.CANCELLED) {
            throw new BusinessException("Cette demande est deja cloturee.", HttpStatus.BAD_REQUEST);
        }

        // Check if any proposals were accepted
        boolean hasAccepted = proposalRepository.findByServiceRequest_IdAndStatus(requestId, ProposalStatus.ACCEPTED)
                .size() > 0;

        serviceRequest.setStatus(hasAccepted ? ServiceRequestStatus.COMPLETED : ServiceRequestStatus.CANCELLED);
        serviceRequestRepository.save(serviceRequest);

        // Reject all remaining PENDING proposals
        List<Proposal> pendingProposals = proposalRepository.findByServiceRequest_IdAndStatus(requestId, ProposalStatus.PENDING);
        for (Proposal p : pendingProposals) {
            p.setStatus(ProposalStatus.REJECTED);
            proposalRepository.save(p);

            notificationService.createNotification(
                    p.getFreelancer().getUser().getId(),
                    NotificationType.PROPOSAL_REJECTED,
                    "La demande \"" + serviceRequest.getTitle() + "\" a ete cloturee.",
                    "SERVICE_REQUEST",
                    serviceRequest.getId());
        }
    }

    // --- Mapping (static for reuse) ---

    public static ProposalDto mapProposalToDto(Proposal proposal) {
        FreelancerProfile fp = proposal.getFreelancer();
        User freelancerUser = fp.getUser();

        return ProposalDto.builder()
                .id(proposal.getId())
                .serviceRequestId(proposal.getServiceRequest().getId())
                .serviceRequestTitle(proposal.getServiceRequest().getTitle())
                .freelancerId(freelancerUser.getId())
                .freelancerEmail(freelancerUser.getEmail())
                .freelancerFirstName(freelancerUser.getFirstName())
                .freelancerLastName(freelancerUser.getLastName())
                .freelancerCity(freelancerUser.getCity())
                .freelancerHeadline(fp.getHeadline())
                .freelancerRating(fp.getAverageRating())
                .freelancerCompletedOrders(fp.getCompletedOrders())
                .message(proposal.getMessage())
                .proposedPrice(proposal.getProposedPrice())
                .estimatedDays(proposal.getEstimatedDays())
                .proposedSteps(proposal.getProposedSteps() != null ? proposal.getProposedSteps() : List.of())
                .portfolioUrl(proposal.getPortfolioUrl())
                .status(proposal.getStatus())
                .createdAt(proposal.getCreatedAt())
                .build();
    }

    // --- Milestones ---

    private void createMilestonesFromProposal(Order order, Proposal proposal) {
        List<String> steps = proposal.getProposedSteps() != null ? proposal.getProposedSteps() : List.of();
        if (steps.isEmpty()) {
            createDefaultMilestones(order);
            return;
        }

        BigDecimal amount = order.getAgreedPrice() != null ? order.getAgreedPrice() : BigDecimal.ZERO;
        BigDecimal stepAmount = amount.divide(new BigDecimal(steps.size()), 2, RoundingMode.HALF_UP);
        BigDecimal allocated = BigDecimal.ZERO;

        for (int index = 0; index < steps.size(); index++) {
            boolean isLast = index == steps.size() - 1;
            BigDecimal milestoneAmount = isLast ? amount.subtract(allocated) : stepAmount;
            allocated = allocated.add(milestoneAmount);

            missionMilestoneRepository.save(MissionMilestone.builder()
                    .order(order)
                    .title(steps.get(index))
                    .description("Etape proposee dans l'offre personnalisee du freelance.")
                    .amount(milestoneAmount)
                    .deadline(order.getDueDate())
                    .timerDurationMinutes(resolveProposalStepTimerMinutes(proposal, steps.size()))
                    .status(MissionMilestoneStatus.PENDING)
                    .sortOrder(index + 1)
                    .build());
        }
    }

    private void createDefaultMilestones(Order order) {
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

    private int resolveProposalStepTimerMinutes(Proposal proposal, int stepCount) {
        int safeStepCount = Math.max(stepCount, 1);
        int safeEstimatedDays = proposal.getEstimatedDays() != null ? Math.max(proposal.getEstimatedDays(), 1) : 1;
        return Math.max(60, (safeEstimatedDays * 24 * 60) / safeStepCount);
    }

    private BigDecimal splitAmount(BigDecimal amount, String ratio) {
        return amount.multiply(new BigDecimal(ratio)).setScale(2, RoundingMode.HALF_UP);
    }

    // --- Utilities ---

    private String normalizeRequiredText(String value, String errorMessage) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new BusinessException(errorMessage, HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private List<String> normalizeProposedSteps(List<String> values) {
        if (values == null) {
            return List.of();
        }

        List<String> normalized = new ArrayList<>();
        for (String value : values) {
            String step = normalizeOptionalText(value);
            if (step == null) {
                continue;
            }
            if (step.length() > 160) {
                throw new BusinessException("Chaque etape proposee doit rester sous 160 caracteres.", HttpStatus.BAD_REQUEST);
            }
            normalized.add(step);
        }

        if (normalized.size() > 6) {
            throw new BusinessException("Vous pouvez proposer 6 etapes maximum.", HttpStatus.BAD_REQUEST);
        }

        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

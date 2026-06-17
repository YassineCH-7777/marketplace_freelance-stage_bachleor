package com.marketplace.controller;

import com.marketplace.dto.order.MissionMilestoneDto;
import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderDisputeRequestDto;
import com.marketplace.dto.order.OrderExecutionUpdateDto;
import com.marketplace.dto.order.OrderRequestDto;
import com.marketplace.dto.request.ProposalDto;
import com.marketplace.dto.service.ServiceDto;
import com.marketplace.dto.user.FreelancerProfileDto;
import com.marketplace.model.User;
import com.marketplace.service.FreelancerProfileService;
import com.marketplace.service.OrderService;
import com.marketplace.service.ProposalService;
import com.marketplace.service.ServiceService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/freelancer")
@RequiredArgsConstructor
public class FreelancerController {

    private final ServiceService serviceService;
    private final OrderService orderService;
    private final FreelancerProfileService profileService;
    private final ProposalService proposalService;

    // --- Profile Management ---
    /**
     * Retourne le profil professionnel du freelance connecte.
     */
    @GetMapping("/profile")
    public ResponseEntity<FreelancerProfileDto> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(profileService.getProfile(user.getId()));
    }

    /**
     * Met a jour les informations publiques du profil freelance.
     */
    @PutMapping("/profile")
    public ResponseEntity<FreelancerProfileDto> updateProfile(@AuthenticationPrincipal User user, @RequestBody FreelancerProfileDto dto) {
        return ResponseEntity.ok(profileService.updateProfile(user.getId(), dto));
    }

    // --- Services Management ---
    
    /**
     * Cree une offre de service rattachee au freelance connecte.
     */
    @PostMapping("/services")
    public ResponseEntity<ServiceDto> createService(@AuthenticationPrincipal User user, @RequestBody ServiceDto dto) {
        return ResponseEntity.ok(serviceService.createService(user.getId(), dto));
    }

    /**
     * Modifie une offre existante apres verification de son proprietaire.
     */
    @PutMapping("/services/{id}")
    public ResponseEntity<ServiceDto> updateService(@PathVariable Long id, @AuthenticationPrincipal User user, @RequestBody ServiceDto dto) {
        return ResponseEntity.ok(serviceService.updateService(id, user.getId(), dto));
    }

    /**
     * Archive une offre pour la retirer du catalogue public.
     */
    @DeleteMapping("/services/{id}")
    public ResponseEntity<Void> archiveService(@PathVariable Long id, @AuthenticationPrincipal User user) {
        serviceService.deleteService(id, user.getId());
        return ResponseEntity.ok().build();
    }

    // --- Orders Management ---

    /**
     * Liste les demandes directes envoyees au freelance.
     */
    @GetMapping("/requests")
    public ResponseEntity<List<OrderRequestDto>> getIncomingRequests(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getIncomingRequests(user.getId()));
    }

    /**
     * Accepte une demande directe et cree la commande correspondante.
     */
    @PutMapping("/requests/{id}/accept")
    public ResponseEntity<Void> acceptRequest(@PathVariable Long id, @AuthenticationPrincipal User user) {
        orderService.acceptRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * Refuse une demande directe recue par le freelance.
     */
    @PutMapping("/requests/{id}/refuse")
    public ResponseEntity<Void> refuseRequest(@PathVariable Long id, @AuthenticationPrincipal User user) {
        orderService.refuseRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * Recupere les commandes en cours ou passees du freelance.
     */
    @GetMapping("/orders")
    public ResponseEntity<List<OrderDto>> getOngoingOrders(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getFreelancerOrders(user.getId()));
    }

    /**
     * Met a jour l'etat d'execution, la progression et les preuves de livraison.
     */
    @PutMapping("/orders/{id}")
    public ResponseEntity<OrderDto> updateOrderExecution(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody OrderExecutionUpdateDto dto) {
        return ResponseEntity.ok(orderService.updateFreelancerOrder(id, user.getId(), dto));
    }

    /**
     * Ouvre un litige cote freelance lorsque la mission est contestee.
     */
    @PutMapping("/orders/{id}/dispute")
    public ResponseEntity<OrderDto> openDispute(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody OrderDisputeRequestDto dto) {
        return ResponseEntity.ok(orderService.openFreelancerDispute(id, user.getId(), dto));
    }

    /**
     * Ajoute un jalon de mission pour suivre l'avancement operationnel.
     */
    @PostMapping("/orders/{id}/milestones")
    public ResponseEntity<MissionMilestoneDto> addMissionMilestone(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody MissionMilestoneDto dto) {
        return ResponseEntity.ok(orderService.addMissionMilestone(id, user.getId(), dto));
    }

    /**
     * Met a jour un jalon existant et recalcule la progression de la mission.
     */
    @PutMapping("/orders/{orderId}/milestones/{milestoneId}")
    public ResponseEntity<MissionMilestoneDto> updateMissionMilestone(
            @PathVariable Long orderId,
            @PathVariable Long milestoneId,
            @AuthenticationPrincipal User user,
            @RequestBody MissionMilestoneDto dto) {
        return ResponseEntity.ok(orderService.updateMissionMilestone(orderId, milestoneId, user.getId(), dto));
    }

    // --- Proposals (demand-driven marketplace) ---

    /**
     * Depose une candidature sur une demande publique client.
     */
    @PostMapping("/proposals")
    public ResponseEntity<ProposalDto> submitProposal(
            @AuthenticationPrincipal User user,
            @RequestBody ProposalDto dto) {
        return ResponseEntity.ok(proposalService.submitProposal(user.getId(), dto));
    }

    /**
     * Liste les candidatures envoyees par le freelance.
     */
    @GetMapping("/proposals")
    public ResponseEntity<List<ProposalDto>> getMyProposals(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(proposalService.getFreelancerProposals(user.getId()));
    }

    /**
     * Retire une candidature tant qu'elle n'a pas encore ete acceptee.
     */
    @DeleteMapping("/proposals/{id}")
    public ResponseEntity<Void> withdrawProposal(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        proposalService.withdrawProposal(id, user.getId());
        return ResponseEntity.ok().build();
    }
}

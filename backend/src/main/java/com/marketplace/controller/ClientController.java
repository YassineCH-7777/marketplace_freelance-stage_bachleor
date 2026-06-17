package com.marketplace.controller;

import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderClientDecisionDto;
import com.marketplace.dto.order.OrderDisputeRequestDto;
import com.marketplace.dto.order.OrderRequestDto;
import com.marketplace.dto.favorite.FavoriteDto;
import com.marketplace.dto.request.ProposalDto;
import com.marketplace.dto.request.ServiceRequestDto;
import com.marketplace.dto.review.ReviewDto;
import com.marketplace.dto.user.UserDto;
import com.marketplace.model.User;
import com.marketplace.service.ClientProfileService;
import com.marketplace.service.FavoriteService;
import com.marketplace.service.OrderService;
import com.marketplace.service.ProposalService;
import com.marketplace.service.ReviewService;
import com.marketplace.service.ServiceRequestService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client")
@RequiredArgsConstructor
public class ClientController {

    private final OrderService orderService;
    private final ReviewService reviewService;
    private final ClientProfileService clientProfileService;
    private final ServiceRequestService serviceRequestService;
    private final ProposalService proposalService;
    private final FavoriteService favoriteService;

    /**
     * Retourne le profil du client actuellement connecte.
     */
    @GetMapping("/profile")
    public ResponseEntity<UserDto> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clientProfileService.getProfile(user.getId()));
    }

    /**
     * Met a jour les informations personnelles et de recherche du client.
     */
    @PutMapping("/profile")
    public ResponseEntity<UserDto> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UserDto dto) {
        return ResponseEntity.ok(clientProfileService.updateProfile(user.getId(), dto));
    }

    /**
     * Envoie une demande directe a un freelance depuis une fiche service.
     */
    @PostMapping("/requests")
    public ResponseEntity<OrderRequestDto> sendOrderRequest(
            @AuthenticationPrincipal User user, 
            @RequestBody OrderRequestDto dto) {
        return ResponseEntity.ok(orderService.createOrderRequest(user.getId(), dto));
    }

    /**
     * Liste toutes les commandes suivies par le client connecte.
     */
    @GetMapping("/orders")
    public ResponseEntity<List<OrderDto>> getClientOrders(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getClientOrders(user.getId()));
    }

    /**
     * Confirme le paiement escrow simule avant le demarrage de la mission.
     */
    @PutMapping("/orders/{id}/confirm-payment")
    public ResponseEntity<OrderDto> confirmEscrowPayment(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.confirmEscrowPayment(id, user.getId()));
    }

    /**
     * Valide la livraison et termine la commande lorsque le client est satisfait.
     */
    @PutMapping("/orders/{id}/accept-delivery")
    public ResponseEntity<OrderDto> acceptDelivery(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) OrderClientDecisionDto dto) {
        return ResponseEntity.ok(orderService.acceptDelivery(id, user.getId(), dto));
    }

    /**
     * Demande une revision lorsque la livraison ne respecte pas encore le brief.
     */
    @PutMapping("/orders/{id}/request-revision")
    public ResponseEntity<OrderDto> requestRevision(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody OrderClientDecisionDto dto) {
        return ResponseEntity.ok(orderService.requestRevision(id, user.getId(), dto));
    }

    /**
     * Ouvre un litige client sur une commande bloquee ou contestee.
     */
    @PutMapping("/orders/{id}/dispute")
    public ResponseEntity<OrderDto> openDispute(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody OrderDisputeRequestDto dto) {
        return ResponseEntity.ok(orderService.openClientDispute(id, user.getId(), dto));
    }

    /**
     * Publie un avis post-livraison pour alimenter la confiance locale.
     */
    @PostMapping("/reviews")
    public ResponseEntity<ReviewDto> leaveReview(
            @AuthenticationPrincipal User user, 
            @RequestBody ReviewDto dto) {
        return ResponseEntity.ok(reviewService.leaveReview(user.getId(), dto));
    }

    // --- Favorites ---

    /**
     * Recupere les services et freelances favoris du client.
     */
    @GetMapping("/favorites")
    public ResponseEntity<List<FavoriteDto>> getFavorites(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.getClientFavorites(user.getId()));
    }

    /**
     * Ajoute un service au tableau de favoris du client.
     */
    @PostMapping("/favorites/services/{serviceId}")
    public ResponseEntity<FavoriteDto> addServiceFavorite(
            @PathVariable Long serviceId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.addServiceFavorite(user.getId(), serviceId));
    }

    /**
     * Retire un service des favoris du client.
     */
    @DeleteMapping("/favorites/services/{serviceId}")
    public ResponseEntity<Void> removeServiceFavorite(
            @PathVariable Long serviceId,
            @AuthenticationPrincipal User user) {
        favoriteService.removeServiceFavorite(user.getId(), serviceId);
        return ResponseEntity.ok().build();
    }

    /**
     * Ajoute un profil freelance aux favoris du client.
     */
    @PostMapping("/favorites/freelancers/{freelancerUserId}")
    public ResponseEntity<FavoriteDto> addFreelancerFavorite(
            @PathVariable Long freelancerUserId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.addFreelancerFavorite(user.getId(), freelancerUserId));
    }

    /**
     * Retire un profil freelance des favoris du client.
     */
    @DeleteMapping("/favorites/freelancers/{freelancerUserId}")
    public ResponseEntity<Void> removeFreelancerFavorite(
            @PathVariable Long freelancerUserId,
            @AuthenticationPrincipal User user) {
        favoriteService.removeFreelancerFavorite(user.getId(), freelancerUserId);
        return ResponseEntity.ok().build();
    }

    // --- Service Requests (demand-driven marketplace) ---

    /**
     * Publie une demande ouverte afin que les freelances puissent candidater.
     */
    @PostMapping("/service-requests")
    public ResponseEntity<ServiceRequestDto> createServiceRequest(
            @AuthenticationPrincipal User user,
            @RequestBody ServiceRequestDto dto) {
        return ResponseEntity.ok(serviceRequestService.createServiceRequest(user.getId(), dto));
    }

    /**
     * Liste les demandes ouvertes ou passees appartenant au client.
     */
    @GetMapping("/service-requests")
    public ResponseEntity<List<ServiceRequestDto>> getMyServiceRequests(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(serviceRequestService.getClientServiceRequests(user.getId()));
    }

    /**
     * Affiche le detail d'une demande client avec ses propositions associees.
     */
    @GetMapping("/service-requests/{id}")
    public ResponseEntity<ServiceRequestDto> getServiceRequestDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(serviceRequestService.getServiceRequestDetail(id));
    }

    /**
     * Modifie une demande tant que son cycle de vie l'autorise.
     */
    @PutMapping("/service-requests/{id}")
    public ResponseEntity<ServiceRequestDto> updateServiceRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody ServiceRequestDto dto) {
        return ResponseEntity.ok(serviceRequestService.updateServiceRequest(id, user.getId(), dto));
    }

    /**
     * Annule une demande appartenant au client connecte.
     */
    @DeleteMapping("/service-requests/{id}")
    public ResponseEntity<Void> cancelServiceRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        serviceRequestService.cancelServiceRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * Ferme une demande apres selection ou abandon des propositions.
     */
    @PutMapping("/service-requests/{id}/close")
    public ResponseEntity<Void> closeServiceRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        proposalService.closeServiceRequest(id, user.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * Accepte une candidature et declenche la creation de la mission.
     */
    @PutMapping("/service-requests/{requestId}/proposals/{proposalId}/accept")
    public ResponseEntity<ProposalDto> acceptProposal(
            @PathVariable Long requestId,
            @PathVariable Long proposalId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(proposalService.acceptProposal(proposalId, user.getId()));
    }

    /**
     * Refuse une candidature sans fermer automatiquement la demande.
     */
    @PutMapping("/service-requests/{requestId}/proposals/{proposalId}/reject")
    public ResponseEntity<ProposalDto> rejectProposal(
            @PathVariable Long requestId,
            @PathVariable Long proposalId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(proposalService.rejectProposal(proposalId, user.getId()));
    }
}

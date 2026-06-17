package com.marketplace.controller;

import com.marketplace.dto.admin.AdminStatsDto;
import com.marketplace.dto.admin.AdminSystemNotificationRequest;
import com.marketplace.dto.order.AdminDisputeDecisionDto;
import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.admin.ReportDto;
import com.marketplace.dto.service.CategoryDto;
import com.marketplace.dto.service.ServiceDto;
import com.marketplace.dto.user.UserDto;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.model.User;
import com.marketplace.service.AdminService;
import com.marketplace.service.OrderService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final OrderService orderService;

    // --- Statistics ---
    /**
     * Fournit les indicateurs globaux affiches dans le tableau de bord admin.
     */
    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        return ResponseEntity.ok(adminService.getPlatformStatistics());
    }

    // --- User Management ---
    /**
     * Liste tous les utilisateurs pour supervision et moderation.
     */
    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    /**
     * Suspend un compte utilisateur en cas d'abus ou de non-conformite.
     */
    @PutMapping("/users/{id}/suspend")
    public ResponseEntity<Void> suspendUser(@PathVariable Long id) {
        adminService.suspendUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * Reactive un compte precedemment suspendu.
     */
    @PutMapping("/users/{id}/activate")
    public ResponseEntity<Void> activateUser(@PathVariable Long id) {
        adminService.activateUser(id);
        return ResponseEntity.ok().build();
    }

    // --- Category Management ---
    /**
     * Recupere les categories utilisees par le catalogue et les demandes.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDto>> getAllCategories() {
        return ResponseEntity.ok(adminService.getAllCategories());
    }

    /**
     * Cree une nouvelle categorie de services.
     */
    @PostMapping("/categories")
    public ResponseEntity<CategoryDto> createCategory(@RequestBody CategoryDto dto) {
        return ResponseEntity.ok(adminService.createCategory(dto));
    }

    /**
     * Modifie le libelle, la description ou l'etat d'une categorie.
     */
    @PutMapping("/categories/{id}")
    public ResponseEntity<CategoryDto> updateCategory(@PathVariable Long id, @RequestBody CategoryDto dto) {
        return ResponseEntity.ok(adminService.updateCategory(id, dto));
    }

    // --- Moderation (Services) ---
    /**
     * Change le statut de moderation d'une offre freelance.
     */
    @PutMapping("/services/{id}/moderate")
    public ResponseEntity<Void> moderateService(@PathVariable Long id, @RequestParam ServiceStatus status) {
        adminService.moderateService(id, status);
        return ResponseEntity.ok().build();
    }

    /**
     * Liste les offres pour controle admin, y compris celles non publiques.
     */
    @GetMapping("/services")
    public ResponseEntity<List<ServiceDto>> getAllServices() {
        return ResponseEntity.ok(adminService.getAllServices());
    }

    // --- Orders ---
    /**
     * Donne une vue globale des commandes de la plateforme.
     */
    @GetMapping("/orders")
    public ResponseEntity<List<OrderDto>> getAllOrders() {
        return ResponseEntity.ok(adminService.getAllOrders());
    }

    /**
     * Tranche un litige de commande et applique la decision admin.
     */
    @PutMapping("/orders/{id}/dispute")
    public ResponseEntity<OrderDto> resolveOrderDispute(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestBody AdminDisputeDecisionDto dto) {
        return ResponseEntity.ok(orderService.resolveAdminDispute(id, user.getId(), dto));
    }

    // --- System notifications ---
    /**
     * Envoie une notification systeme a une audience ciblee.
     */
    @PostMapping("/notifications/system")
    public ResponseEntity<Map<String, Integer>> sendSystemNotification(
            @RequestBody AdminSystemNotificationRequest request) {
        int recipients = adminService.sendSystemNotification(request.getContent(), request.getAudience());
        return ResponseEntity.ok(Map.of("recipients", recipients));
    }

    // --- Reports ---
    /**
     * Liste les signalements a traiter par l'administration.
     */
    @GetMapping("/reports")
    public ResponseEntity<List<ReportDto>> getAllReports() {
        return ResponseEntity.ok(adminService.getAllReports());
    }

    /**
     * Marque un signalement comme resolu avec les notes de traitement.
     */
    @PutMapping("/reports/{id}/resolve")
    public ResponseEntity<Void> resolveReport(@PathVariable Long id, @RequestParam String notes) {
        adminService.resolveReport(id, notes);
        return ResponseEntity.ok().build();
    }
}

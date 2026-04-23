package com.marketplace.controller;

import com.marketplace.dto.admin.AdminStatsDto;
import com.marketplace.dto.admin.ReportDto;
import com.marketplace.dto.service.CategoryDto;
import com.marketplace.dto.user.UserDto;
import com.marketplace.enums.ServiceStatus;
import com.marketplace.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // --- Statistics ---
    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        return ResponseEntity.ok(adminService.getPlatformStatistics());
    }

    // --- User Management ---
    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{id}/suspend")
    public ResponseEntity<Void> suspendUser(@PathVariable Long id) {
        adminService.suspendUser(id);
        return ResponseEntity.ok().build();
    }

    // --- Category Management ---
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDto>> getAllCategories() {
        return ResponseEntity.ok(adminService.getAllCategories());
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryDto> createCategory(@RequestBody CategoryDto dto) {
        return ResponseEntity.ok(adminService.createCategory(dto));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<CategoryDto> updateCategory(@PathVariable Long id, @RequestBody CategoryDto dto) {
        return ResponseEntity.ok(adminService.updateCategory(id, dto));
    }

    // --- Moderation (Services) ---
    @PutMapping("/services/{id}/moderate")
    public ResponseEntity<Void> moderateService(@PathVariable Long id, @RequestParam ServiceStatus status) {
        adminService.moderateService(id, status);
        return ResponseEntity.ok().build();
    }

    // --- Reports ---
    @GetMapping("/reports")
    public ResponseEntity<List<ReportDto>> getAllReports() {
        return ResponseEntity.ok(adminService.getAllReports());
    }

    @PutMapping("/reports/{id}/resolve")
    public ResponseEntity<Void> resolveReport(@PathVariable Long id, @RequestParam String notes) {
        adminService.resolveReport(id, notes);
        return ResponseEntity.ok().build();
    }
}

package com.marketplace.web.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsDto {
    private long totalUsers;
    private long totalClients;
    private long totalFreelancers;
    private long totalOrders;
    private long pendingOrders;
    private long inProgressOrders;
    private long completedOrders;
    private long activeServices;
    private long suspendedServices;
    private long totalCategories;
    private long totalReports;
    private long openReports;
}

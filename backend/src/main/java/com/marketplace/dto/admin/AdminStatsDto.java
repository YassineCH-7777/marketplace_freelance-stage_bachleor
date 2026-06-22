package com.marketplace.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

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
    private long feeTransactions;
    private BigDecimal totalFees;
    private BigDecimal currentMonthFees;
    private BigDecimal freelancerPayouts;
    private Map<String, BigDecimal> feesByCategory;
    private Map<String, BigDecimal> feesByCity;
    private Map<String, BigDecimal> feesByMonth;
}

package com.marketplace.dto.order;

import com.marketplace.enums.MissionMilestoneStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MissionMilestoneDto {
    private Long id;
    private String title;
    private String description;
    private BigDecimal amount;
    private LocalDate deadline;
    private Integer timerDurationMinutes;
    private LocalDateTime timerStartedAt;
    private LocalDateTime timerCompletedAt;
    private MissionMilestoneStatus status;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

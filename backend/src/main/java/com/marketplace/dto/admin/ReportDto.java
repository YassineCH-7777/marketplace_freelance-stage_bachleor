package com.marketplace.dto.admin;

import com.marketplace.enums.ReportStatus;
import com.marketplace.enums.ReportTargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportDto {
    private Long id;
    private Long reporterId;
    private ReportTargetType targetType;
    private Long targetId;
    private String reason;
    private ReportStatus status;
    private String adminNotes;
    private LocalDateTime createdAt;
}

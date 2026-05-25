package com.marketplace.web.dto.order;

import com.marketplace.domain.enums.OrderStatus;
import com.marketplace.domain.enums.PaymentStatus;
import com.marketplace.web.dto.attachment.AttachmentDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderDto {
    private Long id;
    private Long serviceId;
    private String serviceTitle;
    private Long clientId;
    private String clientEmail;
    private Long freelancerId;
    private String freelancerEmail;
    private BigDecimal amount;
    private OrderStatus status;
    private Integer progressPercentage;
    private PaymentStatus paymentStatus;
    private String requestMessage;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate dueDate;
    private String notes;
    private String deliveryNote;
    private String revisionRequest;
    private Integer revisionCount;
    private Integer maxRevisionRounds;
    private LocalDateTime deliveredAt;
    private List<AttachmentDto> attachments;
    private List<MissionMilestoneDto> milestones;
    private List<MissionActivityDto> activities;
    private Long reviewId;
    private Integer reviewRating;
    private Integer reviewQualityRating;
    private Integer reviewPunctualityRating;
    private Integer reviewCommunicationRating;
    private String reviewComment;
    private LocalDateTime reviewUpdatedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

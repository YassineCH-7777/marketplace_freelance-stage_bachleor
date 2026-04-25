package com.marketplace.dto.order;

import com.marketplace.enums.OrderStatus;
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
    private String requestMessage;
    private LocalDate startDate;
    private LocalDate endDate;
    private String notes;
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

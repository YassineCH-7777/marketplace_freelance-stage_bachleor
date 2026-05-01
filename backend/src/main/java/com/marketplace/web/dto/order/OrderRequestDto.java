package com.marketplace.web.dto.order;

import com.marketplace.domain.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderRequestDto {
    private Long id;
    private Long serviceId;
    private String serviceTitle;
    private Long clientId;
    private String clientEmail;
    private String initialMessage;
    private BigDecimal proposedPrice;
    private RequestStatus status;
    private LocalDateTime createdAt;
}

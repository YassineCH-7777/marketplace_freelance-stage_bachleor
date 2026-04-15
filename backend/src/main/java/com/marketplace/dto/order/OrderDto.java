package com.marketplace.dto.order;

import com.marketplace.enums.OrderStatus;
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
public class OrderDto {
    private Long id;
    private Long serviceId;
    private String serviceTitle;
    private Long clientId;
    private String clientEmail;
    private Long freelancerId;
    private BigDecimal amount;
    private OrderStatus status;
    private LocalDateTime createdAt;
}

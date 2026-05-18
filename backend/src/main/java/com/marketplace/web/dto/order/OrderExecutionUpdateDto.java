package com.marketplace.web.dto.order;

import com.marketplace.domain.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderExecutionUpdateDto {
    private OrderStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate dueDate;
    private Integer progressPercentage;
    private String notes;
    private String deliveryNote;
}

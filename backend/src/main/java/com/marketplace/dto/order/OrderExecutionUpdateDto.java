package com.marketplace.dto.order;

import com.marketplace.enums.OrderStatus;
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
    private String notes;
}

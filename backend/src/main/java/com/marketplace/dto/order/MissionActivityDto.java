package com.marketplace.dto.order;

import com.marketplace.enums.MissionActivityType;
import com.marketplace.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MissionActivityDto {
    private Long id;
    private MissionActivityType type;
    private String title;
    private String details;
    private Long actorUserId;
    private String actorEmail;
    private Integer progressSnapshot;
    private OrderStatus statusSnapshot;
    private LocalDateTime createdAt;
}

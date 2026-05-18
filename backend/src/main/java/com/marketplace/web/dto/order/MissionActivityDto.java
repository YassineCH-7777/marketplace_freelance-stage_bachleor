package com.marketplace.web.dto.order;

import com.marketplace.domain.enums.MissionActivityType;
import com.marketplace.domain.enums.OrderStatus;
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

package com.marketplace.dto.assistant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ClientRequestDraftDto {
    private Long id;
    private Long userId;
    private String category;
    private String city;
    private String mode;
    private BigDecimal budget;
    private Integer deadlineDays;
    private String objective;
    private List<String> deliverables;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

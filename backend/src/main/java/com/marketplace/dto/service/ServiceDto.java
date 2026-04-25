package com.marketplace.dto.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ServiceDto {
    private Long id;
    private String title;
    private String description;
    private BigDecimal price;
    private Integer deliveryTimeDays;
    private Long categoryId;
    private String categoryName;
    private Long freelancerId;
    private String freelancerEmail;
    private String freelancerCity;
    private String serviceCity;
    private Boolean remote;
    private String executionMode;
    private String status;
}

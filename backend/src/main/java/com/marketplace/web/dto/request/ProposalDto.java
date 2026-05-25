package com.marketplace.web.dto.request;

import com.marketplace.domain.enums.ProposalStatus;
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
public class ProposalDto {
    private Long id;
    private Long serviceRequestId;
    private String serviceRequestTitle;
    private Long freelancerId;
    private String freelancerEmail;
    private String freelancerFirstName;
    private String freelancerLastName;
    private String freelancerCity;
    private String freelancerHeadline;
    private BigDecimal freelancerRating;
    private Integer freelancerCompletedOrders;
    private String message;
    private BigDecimal proposedPrice;
    private Integer estimatedDays;
    private List<String> proposedSteps;
    private String portfolioUrl;
    private ProposalStatus status;
    private LocalDateTime createdAt;
}

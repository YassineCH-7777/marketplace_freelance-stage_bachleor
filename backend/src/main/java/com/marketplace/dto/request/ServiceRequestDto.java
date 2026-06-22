package com.marketplace.dto.request;

import com.marketplace.enums.ServiceRequestStatus;
import com.marketplace.dto.attachment.AttachmentDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ServiceRequestDto {
    private Long id;
    private Long clientId;
    private String clientEmail;
    private String clientFirstName;
    private String clientLastName;
    private String clientCity;
    private Long categoryId;
    private String categoryName;
    private String title;
    private String description;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
    private LocalDate deadline;
    private String city;
    private boolean remote;
    private String executionMode;
    private Double latitude;
    private Double longitude;
    private Integer requestRadiusKm;
    private boolean urgent;
    private List<String> requiredSkills;
    private ServiceRequestStatus status;
    private Long proposalCount;
    private List<ProposalDto> proposals;
    private List<AttachmentDto> attachments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

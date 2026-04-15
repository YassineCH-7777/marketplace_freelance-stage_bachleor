package com.marketplace.dto.message;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ConversationDto {
    private Long id;
    private Long clientId;
    private String clientEmail;
    private Long freelancerId;
    private String freelancerEmail;
    private LocalDateTime updatedAt;
    private List<MessageDto> messages; // Optional
}

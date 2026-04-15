package com.marketplace.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FreelancerProfileDto {
    private Long id;
    private String email;
    private String bio;
    private String city;
    private String portfolioUrl;
    private String skills;
}

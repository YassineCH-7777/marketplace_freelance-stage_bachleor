package com.marketplace.web.dto.user;

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
    private String firstName;
    private String lastName;
    private String phone;
    private String headline;
    private String bio;
    private String city;
    private String searchCity;
    private String searchPlaceId;
    private Double searchLatitude;
    private Double searchLongitude;
    private Integer searchRadiusKm;
    private String portfolioUrl;
    private String skills;
}

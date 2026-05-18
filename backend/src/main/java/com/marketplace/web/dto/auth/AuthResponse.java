package com.marketplace.web.dto.auth;

import com.marketplace.domain.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String city;
    private String searchCity;
    private String searchPlaceId;
    private Double searchLatitude;
    private Double searchLongitude;
    private Integer searchRadiusKm;
    private UserRole role;
}

package com.marketplace.dto.user;

import com.marketplace.enums.UserRole;
import com.marketplace.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
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
    private UserStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

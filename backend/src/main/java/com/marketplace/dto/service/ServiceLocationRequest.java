package com.marketplace.dto.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ServiceLocationRequest {
    private String city;
    private Double latitude;
    private Double longitude;
    private Integer radiusKm;
}

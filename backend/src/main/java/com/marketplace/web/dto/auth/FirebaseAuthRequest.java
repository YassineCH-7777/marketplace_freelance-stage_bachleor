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
public class FirebaseAuthRequest {
    private String idToken;
    private String firstName;
    private String lastName;
    private UserRole role;
}

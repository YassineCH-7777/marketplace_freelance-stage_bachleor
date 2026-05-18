package com.marketplace.application.service;

import com.marketplace.web.dto.auth.AuthResponse;
import com.marketplace.web.dto.auth.LoginRequest;
import com.marketplace.web.dto.auth.RegisterRequest;
import com.marketplace.domain.model.FreelancerProfile;
import com.marketplace.domain.model.User;
import com.marketplace.domain.enums.UserRole;
import com.marketplace.domain.enums.UserStatus;
import com.marketplace.infrastructure.persistence.FreelancerProfileRepository;
import com.marketplace.infrastructure.persistence.UserRepository;
import com.marketplace.infrastructure.security.JwtService;
import com.marketplace.infrastructure.security.TokenBlacklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.marketplace.web.exception.BusinessException;
import com.marketplace.web.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final FreelancerProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final TokenBlacklistService tokenBlacklistService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
                if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                        throw new BusinessException("Cet e-mail est déjà utilisé", org.springframework.http.HttpStatus.CONFLICT);
                }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(normalizeRegistrationName(request.getFirstName(), "New"))
                .lastName(normalizeRegistrationName(request.getLastName(), "User"))
                .role(request.getRole() != null ? request.getRole() : UserRole.CLIENT)
                .status(UserStatus.ACTIVE)
                .searchRadiusKm(10)
                .build();
        
        user = userRepository.save(user);

        // If the user registered as FREELANCER, create an empty profile for them
        if (user.getRole() == UserRole.FREELANCER) {
            FreelancerProfile profile = FreelancerProfile.builder()
                    .user(user)
                    .skills(java.util.List.of())
                    .averageRating(java.math.BigDecimal.ZERO)
                    .totalReviews(0)
                    .completedOrders(0)
                    .build();
            profileRepository.save(profile);
        }

        String jwtToken = jwtService.generateToken(user);
        
        return mapToAuthResponse(user, jwtToken);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new BadCredentialsException("Identifiants invalides", ex);
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));

        String jwtToken = jwtService.generateToken(user);

        return mapToAuthResponse(user, jwtToken);
    }

        public void logout(String jwt) {
                try {
                        java.util.Date exp = jwtService.extractExpiration(jwt);
                        tokenBlacklistService.blacklist(jwt, exp.getTime());
                } catch (Exception ignored) {
                        // ignore and return
        }
        }

    private String normalizeRegistrationName(String value, String fallback) {
        String normalized = value == null ? "" : value.trim();
        return normalized.length() >= 2 ? normalized : fallback;
    }

    private AuthResponse mapToAuthResponse(User user, String jwtToken) {
        return AuthResponse.builder()
                .token(jwtToken)
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .city(user.getCity())
                .searchCity(user.getSearchCity())
                .searchPlaceId(user.getSearchPlaceId())
                .searchLatitude(user.getSearchLatitude())
                .searchLongitude(user.getSearchLongitude())
                .searchRadiusKm(resolveSearchRadius(user.getSearchRadiusKm()))
                .role(user.getRole())
                .build();
    }

    private Integer resolveSearchRadius(Integer radiusKm) {
        return radiusKm != null && java.util.Set.of(5, 10, 20, 50).contains(radiusKm) ? radiusKm : 10;
    }
}

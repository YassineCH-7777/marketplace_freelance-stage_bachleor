package com.marketplace.service;

import com.marketplace.dto.auth.AuthResponse;
import com.marketplace.dto.auth.LoginRequest;
import com.marketplace.dto.auth.RegisterRequest;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.User;
import com.marketplace.enums.UserRole;
import com.marketplace.enums.UserStatus;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.UserRepository;
import com.marketplace.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final FreelancerProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
        private final com.marketplace.security.TokenBlacklistService tokenBlacklistService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Cet e-mail est déjà utilisé");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole() != null ? request.getRole() : UserRole.CLIENT)
                .status(UserStatus.ACTIVE)
                .build();
        
        user = userRepository.save(user);

        // If the user registered as FREELANCER, create an empty profile for them
        if (user.getRole() == UserRole.FREELANCER) {
            FreelancerProfile profile = FreelancerProfile.builder()
                    .user(user)
                    .build();
            profileRepository.save(profile);
        }

        String jwtToken = jwtService.generateToken(user);
        
        return AuthResponse.builder()
                .token(jwtToken)
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        String jwtToken = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(jwtToken)
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

        public void logout(String jwt) {
                try {
                        java.util.Date exp = jwtService.extractExpiration(jwt);
                        tokenBlacklistService.blacklist(jwt, exp.getTime());
                } catch (Exception ignored) {
                        // ignore and return
                }
        }
}

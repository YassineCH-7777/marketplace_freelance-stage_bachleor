package com.marketplace.service;

import com.marketplace.enums.UserRole;
import com.marketplace.enums.UserStatus;
import com.marketplace.model.FreelancerProfile;
import com.marketplace.model.User;
import com.marketplace.persistence.FreelancerProfileRepository;
import com.marketplace.persistence.UserRepository;
import com.marketplace.security.JwtService;
import com.marketplace.security.TokenBlacklistService;
import com.marketplace.dto.auth.AuthResponse;
import com.marketplace.dto.auth.FirebaseAuthRequest;
import com.marketplace.dto.auth.GoogleAuthRequest;
import com.marketplace.dto.auth.LoginRequest;
import com.marketplace.dto.auth.PasswordResetRequest;
import com.marketplace.dto.auth.RegisterRequest;
import com.marketplace.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final String INVALID_LOGIN_MESSAGE =
            "Adresse e-mail ou mot de passe incorrect. Verifiez votre saisie, puis reessayez ou utilisez le lien Mot de passe oublie.";

    private final UserRepository userRepository;
    private final FreelancerProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final TokenBlacklistService tokenBlacklistService;
    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        validateRegistrationRequest(email, request.getPassword());
        if (userRepository.findByEmail(email).isPresent()) {
            throw new BusinessException("Cet e-mail est deja utilise", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(normalizeRegistrationName(request.getFirstName(), "New"))
                .lastName(normalizeRegistrationName(request.getLastName(), "User"))
                .role(resolvePublicRole(request.getRole()))
                .status(UserStatus.PENDING)
                .emailVerified(false)
                .authProvider("PASSWORD")
                .searchRadiusKm(10)
                .build();

        user = userRepository.save(user);
        ensureFreelancerProfile(user);

        return mapToAuthResponse(user, null);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException(INVALID_LOGIN_MESSAGE));

        if (user.getStatus() == UserStatus.PENDING || !user.isEmailVerified()) {
            throw new BusinessException("Veuillez valider votre e-mail avant de vous connecter.", HttpStatus.FORBIDDEN);
        }
        if (isBlocked(user)) {
            throw new BusinessException("Ce compte n'est pas autorise a se connecter.", HttpStatus.FORBIDDEN);
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new BadCredentialsException(INVALID_LOGIN_MESSAGE, ex);
        }

        String jwtToken = jwtService.generateToken(user);
        return mapToAuthResponse(user, jwtToken);
    }

    @Transactional
    public AuthResponse registerWithFirebase(FirebaseAuthRequest request) {
        FirebaseTokenVerifier.FirebaseAccount firebaseAccount = firebaseTokenVerifier.verify(request.getIdToken());
        User user = upsertFirebaseUser(firebaseAccount, request, false);
        return mapToAuthResponse(user, null);
    }

    @Transactional
    public AuthResponse authenticateWithFirebase(FirebaseAuthRequest request) {
        FirebaseTokenVerifier.FirebaseAccount firebaseAccount = firebaseTokenVerifier.verify(request.getIdToken());
        if (!firebaseAccount.emailVerified()) {
            throw new BusinessException("Veuillez valider votre e-mail avant de vous connecter.", HttpStatus.FORBIDDEN);
        }

        User user = upsertFirebaseUser(firebaseAccount, request, true);
        if (isBlocked(user)) {
            throw new BusinessException("Ce compte n'est pas autorise a se connecter.", HttpStatus.FORBIDDEN);
        }

        ensureFreelancerProfile(user);
        String jwtToken = jwtService.generateToken(user);
        return mapToAuthResponse(user, jwtToken);
    }

    @Transactional
    public AuthResponse authenticateWithGoogle(GoogleAuthRequest request) {
        GoogleTokenVerifier.GoogleAccount googleAccount = googleTokenVerifier.verify(request.getIdToken());
        if (!googleAccount.emailVerified()) {
            throw new BusinessException("Google n'a pas confirme cet e-mail.", HttpStatus.FORBIDDEN);
        }

        User user = upsertGoogleUser(googleAccount, request);
        if (isBlocked(user)) {
            throw new BusinessException("Ce compte n'est pas autorise a se connecter.", HttpStatus.FORBIDDEN);
        }

        ensureFreelancerProfile(user);
        String jwtToken = jwtService.generateToken(user);
        return mapToAuthResponse(user, jwtToken);
    }

    public AuthResponse verifyEmail(String token) {
        throw new BusinessException("La validation e-mail est maintenant geree par Firebase Auth.");
    }

    public void resendVerification(String email) {
        throw new BusinessException("Le renvoi de validation est maintenant gere par Firebase Auth.");
    }

    public void forgotPassword(String email) {
        throw new BusinessException("La reinitialisation du mot de passe est maintenant geree par Firebase Auth.");
    }

    public AuthResponse resetPassword(PasswordResetRequest request) {
        throw new BusinessException("La reinitialisation du mot de passe est maintenant geree par Firebase Auth.");
    }

    public void logout(String jwt) {
        try {
            java.util.Date exp = jwtService.extractExpiration(jwt);
            tokenBlacklistService.blacklist(jwt, exp.getTime());
        } catch (Exception ignored) {
            // Logout should stay idempotent for expired or malformed tokens.
        }
    }

    private User upsertFirebaseUser(FirebaseTokenVerifier.FirebaseAccount firebaseAccount, FirebaseAuthRequest request, boolean requireActive) {
        String email = normalizeEmail(firebaseAccount.email());
        User user = userRepository.findByEmail(email)
                .map(existingUser -> updateExistingFirebaseUser(existingUser, firebaseAccount, request, requireActive))
                .orElseGet(() -> createFirebaseUser(firebaseAccount, request));

        ensureFreelancerProfile(user);
        return user;
    }

    private User updateExistingFirebaseUser(
            User user,
            FirebaseTokenVerifier.FirebaseAccount firebaseAccount,
            FirebaseAuthRequest request,
            boolean requireActive
    ) {
        if (isBlocked(user)) {
            throw new BusinessException("Ce compte n'est pas autorise a se connecter.", HttpStatus.FORBIDDEN);
        }

        if (isBlank(user.getFirstName())) {
            user.setFirstName(resolveFirebaseFirstName(firebaseAccount, request));
        }
        if (isBlank(user.getLastName())) {
            user.setLastName(resolveFirebaseLastName(firebaseAccount, request));
        }
        if (user.getStatus() == UserStatus.PENDING && request.getRole() != null && !requireActive) {
            user.setRole(resolvePublicRole(request.getRole()));
        }

        user.setEmailVerified(firebaseAccount.emailVerified());
        user.setStatus(firebaseAccount.emailVerified() ? UserStatus.ACTIVE : UserStatus.PENDING);
        user.setAuthProvider("FIREBASE");
        user.setProviderId(firebaseAccount.uid());
        return userRepository.save(user);
    }

    private User createFirebaseUser(FirebaseTokenVerifier.FirebaseAccount firebaseAccount, FirebaseAuthRequest request) {
        User user = User.builder()
                .email(normalizeEmail(firebaseAccount.email()))
                .password(passwordEncoder.encode(createToken()))
                .firstName(resolveFirebaseFirstName(firebaseAccount, request))
                .lastName(resolveFirebaseLastName(firebaseAccount, request))
                .role(resolvePublicRole(request.getRole()))
                .status(firebaseAccount.emailVerified() ? UserStatus.ACTIVE : UserStatus.PENDING)
                .emailVerified(firebaseAccount.emailVerified())
                .authProvider("FIREBASE")
                .providerId(firebaseAccount.uid())
                .searchRadiusKm(10)
                .build();

        return userRepository.save(user);
    }

    private User upsertGoogleUser(GoogleTokenVerifier.GoogleAccount googleAccount, GoogleAuthRequest request) {
        String email = normalizeEmail(googleAccount.email());
        User user = userRepository.findByEmail(email)
                .map(existingUser -> updateExistingGoogleUser(existingUser, googleAccount, request))
                .orElseGet(() -> createGoogleUser(googleAccount, request));

        ensureFreelancerProfile(user);
        return user;
    }

    private User updateExistingGoogleUser(
            User user,
            GoogleTokenVerifier.GoogleAccount googleAccount,
            GoogleAuthRequest request
    ) {
        if (isBlocked(user)) {
            throw new BusinessException("Ce compte n'est pas autorise a se connecter.", HttpStatus.FORBIDDEN);
        }

        if (isBlank(user.getFirstName())) {
            user.setFirstName(resolveGoogleFirstName(googleAccount));
        }
        if (isBlank(user.getLastName())) {
            user.setLastName(resolveGoogleLastName(googleAccount));
        }
        if (user.getStatus() == UserStatus.PENDING && request.getRole() != null) {
            user.setRole(resolvePublicRole(request.getRole()));
        }

        user.setEmailVerified(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setAuthProvider("GOOGLE");
        user.setProviderId(googleAccount.sub());
        return userRepository.save(user);
    }

    private User createGoogleUser(GoogleTokenVerifier.GoogleAccount googleAccount, GoogleAuthRequest request) {
        User user = User.builder()
                .email(normalizeEmail(googleAccount.email()))
                .password(passwordEncoder.encode(createToken()))
                .firstName(resolveGoogleFirstName(googleAccount))
                .lastName(resolveGoogleLastName(googleAccount))
                .role(resolvePublicRole(request.getRole()))
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .authProvider("GOOGLE")
                .providerId(googleAccount.sub())
                .searchRadiusKm(10)
                .build();

        return userRepository.save(user);
    }

    private String createToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeRegistrationName(String value, String fallback) {
        String normalized = value == null ? "" : value.trim();
        return normalized.length() >= 2 ? normalized : fallback;
    }

    private String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private void validateRegistrationRequest(String email, String password) {
        if (email.isBlank() || !email.contains("@")) {
            throw new BusinessException("Adresse e-mail invalide.");
        }
        if (password == null || password.length() < 6) {
            throw new BusinessException("Le mot de passe doit contenir au moins 6 caracteres.");
        }
    }

    private UserRole resolvePublicRole(UserRole role) {
        return role == UserRole.FREELANCER ? UserRole.FREELANCER : UserRole.CLIENT;
    }

    private String resolveFirebaseFirstName(FirebaseTokenVerifier.FirebaseAccount firebaseAccount, FirebaseAuthRequest request) {
        String firstName = normalizeRegistrationName(request.getFirstName(), "");
        if (!firstName.isBlank()) {
            return firstName;
        }
        String fullName = firebaseAccount.name() == null ? "" : firebaseAccount.name().trim();
        int spaceIndex = fullName.indexOf(' ');
        return normalizeRegistrationName(spaceIndex > 0 ? fullName.substring(0, spaceIndex) : fullName, "New");
    }

    private String resolveFirebaseLastName(FirebaseTokenVerifier.FirebaseAccount firebaseAccount, FirebaseAuthRequest request) {
        String lastName = normalizeRegistrationName(request.getLastName(), "");
        if (!lastName.isBlank()) {
            return lastName;
        }
        String fullName = firebaseAccount.name() == null ? "" : firebaseAccount.name().trim();
        int spaceIndex = fullName.indexOf(' ');
        return normalizeRegistrationName(spaceIndex > 0 ? fullName.substring(spaceIndex + 1) : "", "User");
    }

    private String resolveGoogleFirstName(GoogleTokenVerifier.GoogleAccount googleAccount) {
        String givenName = normalizeRegistrationName(googleAccount.givenName(), "");
        if (!givenName.isBlank()) {
            return givenName;
        }
        String fullName = googleAccount.name() == null ? "" : googleAccount.name().trim();
        int spaceIndex = fullName.indexOf(' ');
        return normalizeRegistrationName(spaceIndex > 0 ? fullName.substring(0, spaceIndex) : fullName, "Google");
    }

    private String resolveGoogleLastName(GoogleTokenVerifier.GoogleAccount googleAccount) {
        String familyName = normalizeRegistrationName(googleAccount.familyName(), "");
        if (!familyName.isBlank()) {
            return familyName;
        }
        String fullName = googleAccount.name() == null ? "" : googleAccount.name().trim();
        int spaceIndex = fullName.indexOf(' ');
        return normalizeRegistrationName(spaceIndex > 0 ? fullName.substring(spaceIndex + 1) : "", "User");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private boolean isBlocked(User user) {
        return user.getStatus() == UserStatus.SUSPENDED || user.getStatus() == UserStatus.DELETED;
    }

    private void ensureFreelancerProfile(User user) {
        if (user.getRole() == UserRole.FREELANCER) {
            profileRepository.findByUserId(user.getId()).orElseGet(() -> profileRepository.save(FreelancerProfile.builder()
                    .user(user)
                    .skills(java.util.List.of())
                    .averageRating(java.math.BigDecimal.ZERO)
                    .totalReviews(0)
                    .completedOrders(0)
                    .build()));
        }
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
                .status(user.getStatus())
                .emailVerified(user.isEmailVerified())
                .build();
    }

    private Integer resolveSearchRadius(Integer radiusKm) {
        return radiusKm != null && java.util.Set.of(5, 10, 20, 50).contains(radiusKm) ? radiusKm : 10;
    }
}

package com.marketplace.application.service;

import com.marketplace.web.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

@Service
public class FirebaseTokenVerifier {

    private static final String FIREBASE_JWKS_URI = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

    private final String projectId;
    private JwtDecoder jwtDecoder;

    public FirebaseTokenVerifier(@Value("${firebase.project-id:}") String projectId) {
        this.projectId = projectId;
    }

    public FirebaseAccount verify(String idToken) {
        if (projectId == null || projectId.isBlank()) {
            throw new BusinessException("Firebase Auth n'est pas configure cote backend.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (idToken == null || idToken.isBlank()) {
            throw new BusinessException("Token Firebase manquant.", HttpStatus.BAD_REQUEST);
        }

        try {
            Jwt jwt = getJwtDecoder().decode(idToken);
            String expectedIssuer = "https://securetoken.google.com/" + projectId;

            if (jwt.getIssuer() == null || !expectedIssuer.equals(jwt.getIssuer().toString())) {
                throw new BusinessException("Token Firebase invalide.", HttpStatus.UNAUTHORIZED);
            }
            if (!jwt.getAudience().contains(projectId)) {
                throw new BusinessException("Token Firebase destine a un autre projet.", HttpStatus.UNAUTHORIZED);
            }

            String email = jwt.getClaimAsString("email");
            if (email == null || email.isBlank()) {
                throw new BusinessException("Le token Firebase ne contient pas d'e-mail.", HttpStatus.UNAUTHORIZED);
            }

            Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
            return new FirebaseAccount(
                    jwt.getSubject(),
                    email,
                    Boolean.TRUE.equals(emailVerified),
                    jwt.getClaimAsString("name")
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (JwtException ex) {
            throw new BusinessException("Token Firebase invalide.", HttpStatus.UNAUTHORIZED);
        }
    }

    private JwtDecoder getJwtDecoder() {
        if (jwtDecoder == null) {
            jwtDecoder = NimbusJwtDecoder.withJwkSetUri(FIREBASE_JWKS_URI).build();
        }
        return jwtDecoder;
    }

    public record FirebaseAccount(
            String uid,
            String email,
            boolean emailVerified,
            String name
    ) {
    }
}

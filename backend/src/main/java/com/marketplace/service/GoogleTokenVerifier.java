package com.marketplace.service;

import com.marketplace.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class GoogleTokenVerifier {

    private static final String GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String GOOGLE_ISSUER = "accounts.google.com";
    private static final String GOOGLE_ISSUER_HTTPS = "https://accounts.google.com";

    private final String clientId;
    private JwtDecoder jwtDecoder;

    public GoogleTokenVerifier(@Value("${google.oauth.client-id:}") String clientId) {
        this.clientId = clientId;
    }

    public GoogleAccount verify(String idToken) {
        if (clientId == null || clientId.isBlank()) {
            throw new BusinessException("Google OAuth n'est pas configure cote backend.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (idToken == null || idToken.isBlank()) {
            throw new BusinessException("Token Google manquant.", HttpStatus.BAD_REQUEST);
        }

        try {
            Jwt jwt = getJwtDecoder().decode(idToken);
            String issuer = jwt.getIssuer() == null ? "" : jwt.getIssuer().toString();

            if (!GOOGLE_ISSUER.equals(issuer) && !GOOGLE_ISSUER_HTTPS.equals(issuer)) {
                throw new BusinessException("Token Google invalide.", HttpStatus.UNAUTHORIZED);
            }
            if (!jwt.getAudience().contains(clientId)) {
                throw new BusinessException("Token Google destine a un autre client.", HttpStatus.UNAUTHORIZED);
            }
            if (jwt.getExpiresAt() == null || jwt.getExpiresAt().isBefore(Instant.now())) {
                throw new BusinessException("Token Google expire.", HttpStatus.UNAUTHORIZED);
            }

            String email = jwt.getClaimAsString("email");
            if (email == null || email.isBlank()) {
                throw new BusinessException("Le token Google ne contient pas d'e-mail.", HttpStatus.UNAUTHORIZED);
            }

            Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
            return new GoogleAccount(
                    jwt.getSubject(),
                    email,
                    Boolean.TRUE.equals(emailVerified),
                    jwt.getClaimAsString("name"),
                    jwt.getClaimAsString("given_name"),
                    jwt.getClaimAsString("family_name")
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (JwtException ex) {
            throw new BusinessException("Token Google invalide.", HttpStatus.UNAUTHORIZED);
        }
    }

    private JwtDecoder getJwtDecoder() {
        if (jwtDecoder == null) {
            jwtDecoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWKS_URI).build();
        }
        return jwtDecoder;
    }

    public record GoogleAccount(
            String sub,
            String email,
            boolean emailVerified,
            String name,
            String givenName,
            String familyName
    ) {
    }
}

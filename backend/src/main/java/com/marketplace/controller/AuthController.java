package com.marketplace.controller;

import com.marketplace.service.AuthService;
import com.marketplace.dto.auth.AuthResponse;
import com.marketplace.dto.auth.EmailRequest;
import com.marketplace.dto.auth.FirebaseAuthRequest;
import com.marketplace.dto.auth.GoogleAuthRequest;
import com.marketplace.dto.auth.LoginRequest;
import com.marketplace.dto.auth.PasswordResetRequest;
import com.marketplace.dto.auth.RegisterRequest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Inscrit un nouvel utilisateur local et renvoie son JWT de session.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * Authentifie un utilisateur par email/mot de passe.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Valide l'adresse email a partir du token envoye au client.
     */
    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(authService.verifyEmail(request.get("token")));
    }

    /**
     * Relance l'envoi du mail de verification sans exposer l'existence du compte.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody EmailRequest request) {
        authService.resendVerification(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Si le compte existe, un e-mail de validation a ete envoye."));
    }

    /**
     * Demarre le parcours de reinitialisation du mot de passe.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody EmailRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Si le compte existe, un e-mail a ete envoye."));
    }

    /**
     * Remplace le mot de passe apres validation du token de reinitialisation.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@RequestBody PasswordResetRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    /**
     * Cree un compte a partir d'un token Firebase valide.
     */
    @PostMapping("/firebase/register")
    public ResponseEntity<AuthResponse> firebaseRegister(@RequestBody FirebaseAuthRequest request) {
        return ResponseEntity.ok(authService.registerWithFirebase(request));
    }

    /**
     * Connecte un utilisateur deja connu via Firebase.
     */
    @PostMapping("/firebase")
    public ResponseEntity<AuthResponse> firebase(@RequestBody FirebaseAuthRequest request) {
        return ResponseEntity.ok(authService.authenticateWithFirebase(request));
    }

    /**
     * Connecte ou cree l'utilisateur a partir d'un compte Google OAuth.
     */
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@RequestBody GoogleAuthRequest request) {
        return ResponseEntity.ok(authService.authenticateWithGoogle(request));
    }

    /**
     * Invalide le JWT courant en l'ajoutant a la liste noire applicative.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body("No Bearer token");
        }
        String jwt = authHeader.substring(7);
        authService.logout(jwt);
        return ResponseEntity.ok().build();
    }
}

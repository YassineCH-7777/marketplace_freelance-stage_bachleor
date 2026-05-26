package com.marketplace.web.controller;

import com.marketplace.web.dto.auth.AuthResponse;
import com.marketplace.web.dto.auth.EmailRequest;
import com.marketplace.web.dto.auth.FirebaseAuthRequest;
import com.marketplace.web.dto.auth.GoogleAuthRequest;
import com.marketplace.web.dto.auth.LoginRequest;
import com.marketplace.web.dto.auth.PasswordResetRequest;
import com.marketplace.web.dto.auth.RegisterRequest;
import com.marketplace.application.service.AuthService;
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

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponse> verifyEmail(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(authService.verifyEmail(request.get("token")));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody EmailRequest request) {
        authService.resendVerification(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Si le compte existe, un e-mail de validation a ete envoye."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody EmailRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Si le compte existe, un e-mail a ete envoye."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@RequestBody PasswordResetRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    @PostMapping("/firebase/register")
    public ResponseEntity<AuthResponse> firebaseRegister(@RequestBody FirebaseAuthRequest request) {
        return ResponseEntity.ok(authService.registerWithFirebase(request));
    }

    @PostMapping("/firebase")
    public ResponseEntity<AuthResponse> firebase(@RequestBody FirebaseAuthRequest request) {
        return ResponseEntity.ok(authService.authenticateWithFirebase(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> google(@RequestBody GoogleAuthRequest request) {
        return ResponseEntity.ok(authService.authenticateWithGoogle(request));
    }

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

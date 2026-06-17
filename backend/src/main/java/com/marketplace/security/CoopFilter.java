package com.marketplace.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class CoopFilter extends OncePerRequestFilter {

    private static final String COOP_HEADER = "Cross-Origin-Opener-Policy";
    private static final String SAME_ORIGIN_ALLOW_POPUPS = "same-origin-allow-popups";

    /**
     * Pose l'en-tete COOP compatible avec les popups OAuth cote navigateur.
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        response.setHeader(COOP_HEADER, SAME_ORIGIN_ALLOW_POPUPS);
        filterChain.doFilter(request, response);
    }
}

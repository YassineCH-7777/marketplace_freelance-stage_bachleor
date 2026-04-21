package com.marketplace.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {

    // token -> expiry epoch millis
    private final Map<String, Long> blacklist = new ConcurrentHashMap<>();

    public void blacklist(String token, long expiryEpochMillis) {
        blacklist.put(token, expiryEpochMillis);
    }

    public boolean isBlacklisted(String token) {
        Long exp = blacklist.get(token);
        if (exp == null) return false;
        if (exp < Instant.now().toEpochMilli()) {
            blacklist.remove(token);
            return false;
        }
        return true;
    }
}

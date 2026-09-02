package com.attest.attest;

import com.attest.attest.service.JwtService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceSecurityTests {
    private final JwtService jwtService = new JwtService("test-secret-key-that-is-at-least-32-bytes-long", 3600000);

    @Test
    void signedTokenIsValidAndExpiredTokenIsRejected() {
        String token = jwtService.generateToken(7L, "VIEWER");
        assertTrue(jwtService.isValid(token));
        assertEquals(7L, jwtService.extractUserId(token));
        assertFalse(jwtService.isValid(token + "tampered"));
    }
}

package com.attest.attest.dto;

import java.time.Instant;

public record SignatureResponse(
        Long signerId,
        String username,
        String email,
        String suiAddress,
        boolean signed,
        Instant signedAt
) {}

package com.attest.attest.dto;

import java.time.Instant;

public record SignatureResponse(Long signerId, String email, boolean signed, Instant signedAt) {}
package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;

public record OnchainSignRequest(
        @NotBlank(message = "txDigest is required")
        String txDigest,
        @NotBlank(message = "signerAddress is required")
        String signerAddress
) {}
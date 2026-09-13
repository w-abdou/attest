package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;

public record OnchainRegistrationRequest(
        @NotBlank(message = "objectId is required")
        String objectId,
        @NotBlank(message = "txDigest is required")
        String txDigest,
        @NotBlank(message = "packageId is required")
        String packageId,
        @NotBlank(message = "network is required")
        String network
) {}
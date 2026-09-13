package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LinkSuiAddressRequest(
        @NotBlank(message = "Sui address is required")
        @Pattern(regexp = "^0x[a-fA-F0-9]{64}$", message = "Must be a valid 0x-prefixed 32-byte Sui address")
        String suiAddress
) {}
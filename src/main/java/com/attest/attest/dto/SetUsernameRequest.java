package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;

public record SetUsernameRequest(
        @NotBlank(message = "Username is required")
        String username
) {}

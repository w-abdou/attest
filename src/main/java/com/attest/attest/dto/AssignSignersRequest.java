package com.attest.attest.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record AssignSignersRequest(
        @NotNull(message = "signerUserIds is required")
        List<Long> signerUserIds
) {}
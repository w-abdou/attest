package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateTeamRequest(
        @NotBlank(message = "Team name is required")
        String name
) {}
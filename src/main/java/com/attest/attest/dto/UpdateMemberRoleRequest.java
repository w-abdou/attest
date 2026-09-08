package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateMemberRoleRequest(
        @NotBlank(message = "Team role is required")
        String teamRole
) {}
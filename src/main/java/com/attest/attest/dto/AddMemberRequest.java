package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Identifies the user to add by username, email (if they have one — zkLogin
 * accounts may not), or Sui address. TeamService decides which based on the
 * identifier's shape, so the frontend can offer one plain input field.
 */
public record AddMemberRequest(
        @NotBlank(message = "Username, email, or Sui address is required")
        String identifier,

        @NotBlank(message = "Team role is required")
        String teamRole
) {}

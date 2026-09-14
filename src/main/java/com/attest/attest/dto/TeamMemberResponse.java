package com.attest.attest.dto;

import com.attest.attest.model.TeamRole;

public record TeamMemberResponse(Long userId, String username, String email, String suiAddress, TeamRole teamRole) {}

package com.attest.attest.dto;

import com.attest.attest.model.Team;
import com.attest.attest.model.TeamRole;

import java.time.Instant;

public record TeamResponse(Long id, String name, Long createdBy, Instant createdAt, TeamRole yourRole) {
    public static TeamResponse from(Team team, TeamRole yourRole) {
        return new TeamResponse(team.getId(), team.getName(), team.getCreatedBy(), team.getCreatedAt(), yourRole);
    }
}
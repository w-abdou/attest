package com.attest.attest.repository;

import com.attest.attest.model.TeamMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamMembershipRepository extends JpaRepository<TeamMembership, Long> {
    List<TeamMembership> findByUserId(Long userId);
    List<TeamMembership> findByTeamId(Long teamId);
    Optional<TeamMembership> findByTeamIdAndUserId(Long teamId, Long userId);
    long countByTeamIdAndTeamRole(Long teamId, com.attest.attest.model.TeamRole teamRole);
}
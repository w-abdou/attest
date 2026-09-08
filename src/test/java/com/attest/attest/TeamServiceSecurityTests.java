package com.attest.attest;

import com.attest.attest.exception.TeamMembershipException;
import com.attest.attest.model.Team;
import com.attest.attest.model.TeamMembership;
import com.attest.attest.model.TeamRole;
import com.attest.attest.model.User;
import com.attest.attest.repository.TeamMembershipRepository;
import com.attest.attest.repository.TeamRepository;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.TeamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TeamServiceSecurityTests {

    private TeamRepository teamRepository;
    private TeamMembershipRepository membershipRepository;
    private UserRepository userRepository;
    private TeamService service;

    private static final Long TEAM = 1L;

    @BeforeEach
    void setUp() {
        teamRepository = mock(TeamRepository.class);
        membershipRepository = mock(TeamMembershipRepository.class);
        userRepository = mock(UserRepository.class);
        service = new TeamService(teamRepository, membershipRepository, userRepository);

        Team team = new Team();
        team.setId(TEAM);
        when(teamRepository.findById(TEAM)).thenReturn(Optional.of(team));
    }

    private void requesterIsAdmin(Long userId) {
        TeamMembership m = new TeamMembership();
        m.setTeamId(TEAM); m.setUserId(userId); m.setTeamRole(TeamRole.TEAM_ADMIN);
        when(membershipRepository.findByTeamIdAndUserId(TEAM, userId)).thenReturn(Optional.of(m));
    }

    @Test
    void creatingTeamMakesCreatorAnAdmin() {
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> { Team t = inv.getArgument(0); t.setId(TEAM); return t; });
        when(membershipRepository.save(any(TeamMembership.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createTeam("Legal", 42L);

        verify(membershipRepository).save(argThat(m ->
                m.getUserId().equals(42L) && m.getTeamRole() == TeamRole.TEAM_ADMIN));
    }

    @Test
    void nonAdminCannotAddMembers() {
        TeamMembership viewer = new TeamMembership();
        viewer.setTeamId(TEAM); viewer.setUserId(9L); viewer.setTeamRole(TeamRole.TEAM_VIEWER);
        when(membershipRepository.findByTeamIdAndUserId(TEAM, 9L)).thenReturn(Optional.of(viewer));

        assertThrows(TeamMembershipException.class,
                () -> service.addMember(TEAM, "someone@example.com", "TEAM_SIGNER", 9L));
    }

    @Test
    void addingUnknownEmailIsRejected() {
        requesterIsAdmin(1L);
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());
        assertThrows(TeamMembershipException.class,
                () -> service.addMember(TEAM, "ghost@example.com", "TEAM_SIGNER", 1L));
    }

    @Test
    void addingExistingMemberAgainIsRejected() {
        requesterIsAdmin(1L);
        User target = new User(); target.setId(2L); target.setEmail("dup@example.com");
        when(userRepository.findByEmail("dup@example.com")).thenReturn(Optional.of(target));
        TeamMembership existing = new TeamMembership();
        existing.setTeamId(TEAM); existing.setUserId(2L); existing.setTeamRole(TeamRole.TEAM_VIEWER);
        when(membershipRepository.findByTeamIdAndUserId(TEAM, 2L)).thenReturn(Optional.of(existing));

        assertThrows(TeamMembershipException.class,
                () -> service.addMember(TEAM, "dup@example.com", "TEAM_SIGNER", 1L));
    }

    @Test
    void cannotDemoteLastAdmin() {
        requesterIsAdmin(1L);
        when(membershipRepository.countByTeamIdAndTeamRole(TEAM, TeamRole.TEAM_ADMIN)).thenReturn(1L);
        assertThrows(TeamMembershipException.class,
                () -> service.updateMemberRole(TEAM, 1L, "TEAM_VIEWER", 1L));
    }

    @Test
    void cannotRemoveLastAdmin() {
        requesterIsAdmin(1L);
        when(membershipRepository.countByTeamIdAndTeamRole(TEAM, TeamRole.TEAM_ADMIN)).thenReturn(1L);
        assertThrows(TeamMembershipException.class,
                () -> service.removeMember(TEAM, 1L, 1L));
    }
}
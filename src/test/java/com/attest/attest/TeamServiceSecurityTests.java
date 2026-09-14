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
import com.attest.attest.service.UsernameService;
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
        // Real UsernameService, not a mock — its normalize() is pure and
        // deterministic, so using the real thing is simpler and more faithful
        // than restating its lowercasing rule as a stub.
        service = new TeamService(teamRepository, membershipRepository, userRepository, new UsernameService(userRepository));

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
    void addingBySuiAddressWorksForAWalletOnlyAccountWithNoEmail() {
        requesterIsAdmin(1L);
        String address = "0x" + "c".repeat(64);
        User target = new User(); target.setId(3L); target.setSuiAddress(address); // no email set
        when(userRepository.findBySuiAddress(address)).thenReturn(Optional.of(target));
        when(membershipRepository.save(any(TeamMembership.class))).thenAnswer(inv -> inv.getArgument(0));

        TeamMembership added = service.addMember(TEAM, address, "TEAM_SIGNER", 1L);

        assertEquals(3L, added.getUserId());
        verify(userRepository, never()).findByEmail(any());
    }

    @Test
    void addingAnUnregisteredSuiAddressIsRejected() {
        requesterIsAdmin(1L);
        String address = "0x" + "d".repeat(64);
        when(userRepository.findBySuiAddress(address)).thenReturn(Optional.empty());

        assertThrows(TeamMembershipException.class,
                () -> service.addMember(TEAM, address, "TEAM_SIGNER", 1L));
    }

    @Test
    void addingByUsernameWorksForAWalletOnlyAccountWithNoEmail() {
        requesterIsAdmin(1L);
        User target = new User(); target.setId(4L); target.setUsername("legal_lead");
        when(userRepository.findByUsername("legal_lead")).thenReturn(Optional.of(target));
        when(membershipRepository.save(any(TeamMembership.class))).thenAnswer(inv -> inv.getArgument(0));

        TeamMembership added = service.addMember(TEAM, "legal_lead", "TEAM_SIGNER", 1L);

        assertEquals(4L, added.getUserId());
        verify(userRepository, never()).findByEmail(any());
        verify(userRepository, never()).findBySuiAddress(any());
    }

    @Test
    void addingByUsernameIsCaseInsensitive() {
        requesterIsAdmin(1L);
        User target = new User(); target.setId(4L); target.setUsername("legal_lead");
        when(userRepository.findByUsername("legal_lead")).thenReturn(Optional.of(target));
        when(membershipRepository.save(any(TeamMembership.class))).thenAnswer(inv -> inv.getArgument(0));

        TeamMembership added = service.addMember(TEAM, "Legal_Lead", "TEAM_SIGNER", 1L);

        assertEquals(4L, added.getUserId());
    }

    @Test
    void addingAnUnregisteredUsernameIsRejected() {
        requesterIsAdmin(1L);
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThrows(TeamMembershipException.class,
                () -> service.addMember(TEAM, "ghost", "TEAM_SIGNER", 1L));
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
package com.attest.attest.service;

import com.attest.attest.exception.TeamMembershipException;
import com.attest.attest.exception.TeamNotFoundException;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.model.Team;
import com.attest.attest.model.TeamMembership;
import com.attest.attest.model.TeamRole;
import com.attest.attest.model.User;
import com.attest.attest.repository.TeamMembershipRepository;
import com.attest.attest.repository.TeamRepository;
import com.attest.attest.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMembershipRepository membershipRepository;
    private final UserRepository userRepository;

    public TeamService(TeamRepository teamRepository, TeamMembershipRepository membershipRepository, UserRepository userRepository) {
        this.teamRepository = teamRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
    }

    private TeamRole parseRole(String raw) {
        try {
            return TeamRole.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new TeamMembershipException("Invalid team role: " + raw);
        }
    }

    public Team createTeam(String name, Long creatorId) {
        Team team = new Team();
        team.setName(name);
        team.setCreatedBy(creatorId);
        teamRepository.save(team);

        TeamMembership membership = new TeamMembership();
        membership.setTeamId(team.getId());
        membership.setUserId(creatorId);
        membership.setTeamRole(TeamRole.TEAM_ADMIN);
        membershipRepository.save(membership);

        return team;
    }

    public List<TeamMembership> membershipsForUser(Long userId) {
        return membershipRepository.findByUserId(userId);
    }

    public Team getTeam(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new TeamNotFoundException(teamId));
    }

    /** Returns the requester's membership in a team, or throws if they aren't a member. */
    public TeamMembership requireMembership(Long teamId, Long userId) {
        return membershipRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new TeamMembershipException("You are not a member of this team"));
    }

    public Optional<TeamMembership> findMembership(Long teamId, Long userId) {
        return membershipRepository.findByTeamIdAndUserId(teamId, userId);
    }

    private void requireTeamAdmin(Long teamId, Long userId) {
        TeamMembership m = requireMembership(teamId, userId);
        if (m.getTeamRole() != TeamRole.TEAM_ADMIN) {
            throw new TeamMembershipException("Only a team admin can perform this action");
        }
    }

    public List<TeamMembership> listMembers(Long teamId, Long requesterId) {
        getTeam(teamId);
        requireMembership(teamId, requesterId); // any member can view the roster
        return membershipRepository.findByTeamId(teamId);
    }

    public TeamMembership addMember(Long teamId, String email, String roleRaw, Long requesterId) {
        getTeam(teamId);
        requireTeamAdmin(teamId, requesterId);

        TeamRole role = parseRole(roleRaw);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new TeamMembershipException("No registered user with email " + email));

        if (membershipRepository.findByTeamIdAndUserId(teamId, user.getId()).isPresent()) {
            throw new TeamMembershipException("That user is already a member of this team");
        }

        TeamMembership membership = new TeamMembership();
        membership.setTeamId(teamId);
        membership.setUserId(user.getId());
        membership.setTeamRole(role);
        return membershipRepository.save(membership);
    }

    public TeamMembership updateMemberRole(Long teamId, Long targetUserId, String roleRaw, Long requesterId) {
        getTeam(teamId);
        requireTeamAdmin(teamId, requesterId);

        TeamRole newRole = parseRole(roleRaw);
        TeamMembership membership = membershipRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new TeamMembershipException("That user is not a member of this team"));

        // Guard: don't demote the last remaining admin.
        if (membership.getTeamRole() == TeamRole.TEAM_ADMIN && newRole != TeamRole.TEAM_ADMIN) {
            long admins = membershipRepository.countByTeamIdAndTeamRole(teamId, TeamRole.TEAM_ADMIN);
            if (admins <= 1) {
                throw new TeamMembershipException("Cannot demote the last remaining team admin");
            }
        }

        membership.setTeamRole(newRole);
        return membershipRepository.save(membership);
    }

    public void removeMember(Long teamId, Long targetUserId, Long requesterId) {
        getTeam(teamId);
        requireTeamAdmin(teamId, requesterId);

        TeamMembership membership = membershipRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new TeamMembershipException("That user is not a member of this team"));

        // Guard: don't remove the last remaining admin.
        if (membership.getTeamRole() == TeamRole.TEAM_ADMIN) {
            long admins = membershipRepository.countByTeamIdAndTeamRole(teamId, TeamRole.TEAM_ADMIN);
            if (admins <= 1) {
                throw new TeamMembershipException("Cannot remove the last remaining team admin");
            }
        }

        membershipRepository.delete(membership);
    }
}
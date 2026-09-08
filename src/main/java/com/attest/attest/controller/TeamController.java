package com.attest.attest.controller;

import com.attest.attest.dto.*;
import com.attest.attest.model.Team;
import com.attest.attest.model.TeamMembership;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.TeamService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;
    private final UserRepository userRepository;

    public TeamController(TeamService teamService, UserRepository userRepository) {
        this.teamService = teamService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<TeamResponse> create(@Valid @RequestBody CreateTeamRequest request, HttpServletRequest http) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        Team team = teamService.createTeam(request.name(), userId);
        return ResponseEntity.ok(TeamResponse.from(team, com.attest.attest.model.TeamRole.TEAM_ADMIN));
    }

    @GetMapping
    public ResponseEntity<List<TeamResponse>> myTeams(HttpServletRequest http) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        List<TeamResponse> teams = teamService.membershipsForUser(userId).stream()
                .map(m -> TeamResponse.from(teamService.getTeam(m.getTeamId()), m.getTeamRole()))
                .toList();
        return ResponseEntity.ok(teams);
    }

    @GetMapping("/{teamId}/members")
    public ResponseEntity<List<TeamMemberResponse>> members(@PathVariable Long teamId, HttpServletRequest http) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        List<TeamMembership> memberships = teamService.listMembers(teamId, userId);
        List<TeamMemberResponse> result = memberships.stream().map(m -> {
            String email = userRepository.findById(m.getUserId()).map(User::getEmail).orElse("(unknown)");
            return new TeamMemberResponse(m.getUserId(), email, m.getTeamRole());
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{teamId}/members")
    public ResponseEntity<TeamMemberResponse> addMember(@PathVariable Long teamId, @Valid @RequestBody AddMemberRequest request, HttpServletRequest http) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        TeamMembership m = teamService.addMember(teamId, request.email(), request.teamRole(), userId);
        String email = userRepository.findById(m.getUserId()).map(User::getEmail).orElse("(unknown)");
        return ResponseEntity.ok(new TeamMemberResponse(m.getUserId(), email, m.getTeamRole()));
    }

    @PatchMapping("/{teamId}/members/{targetUserId}")
    public ResponseEntity<TeamMemberResponse> updateMember(@PathVariable Long teamId, @PathVariable Long targetUserId, @Valid @RequestBody UpdateMemberRoleRequest request, HttpServletRequest http) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        TeamMembership m = teamService.updateMemberRole(teamId, targetUserId, request.teamRole(), userId);
        String email = userRepository.findById(m.getUserId()).map(User::getEmail).orElse("(unknown)");
        return ResponseEntity.ok(new TeamMemberResponse(m.getUserId(), email, m.getTeamRole()));
    }

    @DeleteMapping("/{teamId}/members/{targetUserId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long teamId, @PathVariable Long targetUserId, HttpServletRequest http) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        teamService.removeMember(teamId, targetUserId, userId);
        return ResponseEntity.noContent().build();
    }
}
package com.attest.attest.controller;

import com.attest.attest.dto.SetUsernameRequest;
import com.attest.attest.dto.UserResponse;
import com.attest.attest.dto.UsernameAvailabilityResponse;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.UsernameService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final UsernameService usernameService;

    public UserController(UserRepository userRepository, UsernameService usernameService) {
        this.userRepository = userRepository;
        this.usernameService = usernameService;
    }

    /** Current user's own profile, including their username, Sui address, and role. */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("authenticatedUserId");
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
        return ResponseEntity.ok(UserResponse.from(user));
    }

    /**
     * Set (or change) the AUTHENTICATED user's username. Always acts on the
     * caller's own id from the JWT — the request body carries no user id, so
     * there is nothing for a client to spoof here.
     */
    @PostMapping("/me/username")
    public ResponseEntity<UserResponse> setUsername(
            @Valid @RequestBody SetUsernameRequest request,
            HttpServletRequest http
    ) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        User updated = usernameService.setUsername(userId, request.username());
        return ResponseEntity.ok(UserResponse.from(updated));
    }

    /**
     * Whether `username` is a legal, unclaimed username. Excludes the caller's
     * own current username from the "taken" check, so re-checking what you
     * already have correctly comes back available.
     */
    @GetMapping("/username-availability")
    public ResponseEntity<UsernameAvailabilityResponse> checkUsernameAvailability(
            @RequestParam String username,
            HttpServletRequest http
    ) {
        Long userId = (Long) http.getAttribute("authenticatedUserId");
        return ResponseEntity.ok(usernameService.checkAvailability(username, userId));
    }
}

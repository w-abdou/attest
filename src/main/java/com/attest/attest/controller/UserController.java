package com.attest.attest.controller;

import com.attest.attest.dto.LinkSuiAddressRequest;
import com.attest.attest.dto.UserResponse;
import com.attest.attest.exception.ForbiddenException;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Current user's own profile, including any linked Sui address. */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("authenticatedUserId");
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
        return ResponseEntity.ok(UserResponse.from(user));
    }

    /**
     * Link a Sui address to the AUTHENTICATED user. The address is attached to
     * whoever the JWT identifies — never a client-supplied user id. One address
     * can belong to only one account (prevents impersonation).
     */
    @PostMapping("/me/sui-address")
    public ResponseEntity<UserResponse> linkSuiAddress(
            @Valid @RequestBody LinkSuiAddressRequest req,
            HttpServletRequest request
    ) {
        Long userId = (Long) request.getAttribute("authenticatedUserId");
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));

        String address = req.suiAddress();

        // Reject if some OTHER account already claims this address.
        userRepository.findBySuiAddress(address).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new ForbiddenException("That Sui address is already linked to another account");
            }
        });

        user.setSuiAddress(address);
        userRepository.save(user);
        return ResponseEntity.ok(UserResponse.from(user));
    }
}
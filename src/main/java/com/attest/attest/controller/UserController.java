package com.attest.attest.controller;

import com.attest.attest.dto.UserResponse;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Current user's own profile, including their Sui address and role. */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("authenticatedUserId");
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
        return ResponseEntity.ok(UserResponse.from(user));
    }
}

package com.attest.attest.service;

import com.attest.attest.dto.LoginRequest;
import com.attest.attest.dto.RegisterRequest;
import com.attest.attest.exception.EmailAlreadyRegisteredException;
import com.attest.attest.exception.InvalidCredentialsException;
import com.attest.attest.exception.InvalidRoleException;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.model.Role;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailAlreadyRegisteredException(request.email());
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.VIEWER);
        return userRepository.save(user);
    }

    public User login(LoginRequest request) {
        return userRepository.findByEmail(request.email())
                .filter(user -> passwordEncoder.matches(request.password(), user.getPasswordHash()))
                .orElseThrow(InvalidCredentialsException::new);
    }

    /**
     * Changes a user's role. Only ever called by AdminController, which has already
     * confirmed the requester's JWT-authenticated role is ADMIN before calling this.
     * This method itself does not re-check who is calling it.
     */
    public User updateRole(Long userId, String newRoleName) {
        Role newRole;
        try {
            newRole = Role.valueOf(newRoleName.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidRoleException(newRoleName);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        user.setRole(newRole);
        return userRepository.save(user);
    }

    /**
     * Creates a single ADMIN account at startup if both an email and password are
     * configured (see app.bootstrap.* properties) and no user with that email exists
     * yet. This is the only way an ADMIN account can ever be created — never through
     * a public API request. Does nothing if not configured, or if that email is
     * already taken (so it's safe to run on every restart).
     */
    public void bootstrapAdminIfConfigured(String email, String rawPassword) {
        if (email == null || email.isBlank() || rawPassword == null || rawPassword.isBlank()) {
            return;
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(rawPassword));
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
    }
}
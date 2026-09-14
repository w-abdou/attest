package com.attest.attest.service;

import com.attest.attest.exception.InvalidRoleException;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.model.Role;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
     * Pre-creates a single ADMIN account for the configured bootstrap address, if
     * one is configured and no user with that address exists yet. This does NOT
     * grant access by itself — logging in still requires proving control of that
     * address via WalletAuthService, exactly like any other account. All this does
     * is make sure that when the real owner of that address does log in for the
     * first time, find-or-create finds this pre-labeled row (ADMIN) instead of
     * creating a fresh one (SIGNER). Safe to run on every restart.
     */
    public void bootstrapAdminIfConfigured(String suiAddress) {
        if (suiAddress == null || suiAddress.isBlank()) {
            return;
        }
        if (userRepository.findBySuiAddress(suiAddress).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setSuiAddress(suiAddress);
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
    }
}

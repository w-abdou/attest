package com.attest.attest.dto;

import com.attest.attest.model.Role;
import com.attest.attest.model.User;

public record UserResponse(Long id, String username, String email, Role role, String suiAddress) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole(), user.getSuiAddress());
    }
}

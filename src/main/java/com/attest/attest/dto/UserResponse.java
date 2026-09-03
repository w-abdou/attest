package com.attest.attest.dto;

import com.attest.attest.model.Role;

public record UserResponse(Long id, String email, Role role) {}
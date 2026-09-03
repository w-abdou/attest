package com.attest.attest.dto;

import com.attest.attest.model.Role;

public record LoginResponse(Long id, String email, Role role, String token) {}
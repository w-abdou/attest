package com.attest.attest.dto;

import com.attest.attest.model.Role;

public record LoginResponse(Long id, String email, String suiAddress, Role role, String token) {}

package com.attest.attest.dto;

import com.attest.attest.model.Role;

// username is null for a brand-new account — the frontend uses that, right
// after login, to route straight to forced onboarding before anything else.
public record LoginResponse(Long id, String username, String email, String suiAddress, Role role, String token) {}

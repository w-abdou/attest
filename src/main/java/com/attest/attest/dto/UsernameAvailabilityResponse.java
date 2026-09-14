package com.attest.attest.dto;

/**
 * `reason` is null when `available` is true, and a human-readable explanation
 * (invalid format vs. already taken) when it's false — the frontend shows it
 * directly rather than re-deriving why a username was rejected.
 */
public record UsernameAvailabilityResponse(boolean available, String reason) {
    public static UsernameAvailabilityResponse ok() {
        return new UsernameAvailabilityResponse(true, null);
    }
    public static UsernameAvailabilityResponse rejected(String reason) {
        return new UsernameAvailabilityResponse(false, reason);
    }
}

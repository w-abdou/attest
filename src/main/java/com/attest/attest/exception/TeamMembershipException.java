package com.attest.attest.exception;

// Used for membership rule violations (already a member, last admin, not a member, etc.)
public class TeamMembershipException extends RuntimeException {
    public TeamMembershipException(String message) {
        super(message);
    }
}
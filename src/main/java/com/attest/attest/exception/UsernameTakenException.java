package com.attest.attest.exception;

/** A validly-formatted username is already claimed by a different account. */
public class UsernameTakenException extends RuntimeException {
    public UsernameTakenException(String username) {
        super("Username \"" + username + "\" is already taken");
    }
}

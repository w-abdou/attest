package com.attest.attest.exception;

/** A username fails the format rule: 3–30 chars, lowercase letters, digits, underscore only. */
public class InvalidUsernameException extends RuntimeException {
    public InvalidUsernameException(String message) {
        super(message);
    }
}

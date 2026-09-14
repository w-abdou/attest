package com.attest.attest.exception;

/**
 * A zkLogin signature could not be checked because Sui's verification endpoint
 * was unreachable or returned something unexpected — an environmental failure,
 * distinct from the signature simply being invalid. Never treated as success.
 */
public class ZkLoginVerificationUnavailableException extends RuntimeException {
    public ZkLoginVerificationUnavailableException(String message) {
        super(message);
    }
    public ZkLoginVerificationUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}

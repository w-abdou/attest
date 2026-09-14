package com.attest.attest.exception;

/**
 * A wallet sign-in request could not be accepted: the nonce was unknown,
 * expired, or already used, or the signature did not verify. Deliberately one
 * generic message for all of these — never distinguish which, so a caller
 * probing the endpoint learns nothing about why a given attempt failed.
 */
public class InvalidCredentialsException extends RuntimeException {
  public InvalidCredentialsException() {
    super("Invalid or expired wallet sign-in request");
  }
}

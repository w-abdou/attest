package com.attest.attest.exception;

/** The serialized signature's scheme flag is not one this backend can verify. */
public class UnsupportedSignatureSchemeException extends RuntimeException {
    public UnsupportedSignatureSchemeException(int flag) {
        super("Unsupported signature scheme (flag " + flag + "). Only Ed25519 wallet " +
                "signatures and zkLogin are currently supported.");
    }
}

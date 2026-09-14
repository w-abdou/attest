package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * The browser has already uploaded the (possibly encrypted) file straight to
 * Walrus by the time this reaches the backend — this is metadata only, never
 * file bytes. {@code documentHash} is the SHA-256 of the original plaintext,
 * computed client-side before any encryption, so existing integrity/envelope
 * semantics (documentHash, envelopeHash) are unaffected by the storage backend.
 */
public record WalrusUploadRequest(
        @NotBlank(message = "filename is required")
        String filename,
        @NotBlank(message = "contentType is required")
        String contentType,
        @NotBlank(message = "documentHash is required")
        String documentHash,
        @NotBlank(message = "walrusBlobId is required")
        String walrusBlobId,
        String walrusBlobObjectId,
        @Positive(message = "size must be positive")
        long size,
        // Base64 raw AES-256-GCM key, only present when the browser encrypted
        // the blob before uploading it. Null means the blob is stored as
        // plaintext on Walrus (slice A behavior) — still a deliberate choice,
        // not a missing field.
        String encryptionKeyBase64
) {}

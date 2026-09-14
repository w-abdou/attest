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
        // Base64 raw AES-256-GCM key — only ever set by a client still using
        // the older locally-managed-key scheme. New uploads leave this null
        // and set sealEncrypted instead.
        String encryptionKeyBase64,
        // True when the blob was encrypted with Seal before upload (the
        // decryption key is gated by the on-chain seal_approve policy, not
        // stored anywhere). False/absent means either unencrypted (slice A)
        // or the legacy local-AES scheme (encryptionKeyBase64 set instead).
        boolean sealEncrypted,
        // The Seal identity (hex) the blob was encrypted under. Required
        // when sealEncrypted is true; ignored otherwise.
        String sealIdHex
) {}

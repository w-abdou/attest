package com.attest.attest.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Used for Walrus-backed documents: the browser has already downloaded the
 * blob and (if encrypted) decrypted it, so it can hash the plaintext itself
 * and send just the hash rather than re-uploading the whole file.
 */
public record VerifyHashRequest(
        @NotBlank(message = "documentHash is required")
        String documentHash
) {}

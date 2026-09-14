package com.attest.attest.dto;

import java.time.Instant;

/** The nonce and exact message text the client must have a wallet sign. */
public record WalletChallengeResponse(String nonce, String message, Instant expiresAt) {}

package com.attest.attest.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.Instant;

/**
 * A one-time, time-limited nonce issued by /api/auth/wallet/challenge and
 * consumed by /api/auth/wallet/verify. Not bound to a claimed address up
 * front — the address is only established once a valid signature over this
 * nonce's message proves control of it.
 */
@Entity
@Table(name = "wallet_auth_challenges")
@Getter
@Setter
@NoArgsConstructor
public class WalletAuthChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nonce;

    // The exact text the client was shown and had the wallet sign. Stored
    // verbatim (not re-derived from createdAt/expiresAt at verify time) so a
    // timestamp column's storage precision can never make the reconstructed
    // message differ, byte for byte, from what was actually signed.
    @Column(nullable = false, length = 1024)
    private String message;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}

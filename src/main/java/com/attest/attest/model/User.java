package com.attest.attest.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Accounts are wallet-native: identity is the verified Sui address below, not
    // email/password. Email is nullable — zkLogin accounts have none unless later
    // extracted from the OAuth claims, and it exists today only for display.
    @Column(nullable = true, unique = true)
    private String email;

    // No longer set for any account created after the wallet-auth migration; kept
    // nullable rather than dropped so pre-migration rows don't need a destructive
    // column change.
    @Column(nullable = true)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // The Sui address that proved ownership (via a signed challenge) to create or
    // authenticate this account. Unique so no two accounts can claim the same
    // address. Nullable only for legacy rows that predate wallet-native auth.
    @Column(nullable = true, unique = true)
    private String suiAddress;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
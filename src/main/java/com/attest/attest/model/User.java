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

    // Chosen during forced onboarding, right after a brand-new account's first
    // wallet login — a fresh row always starts with username = null. "Required"
    // is therefore enforced by the onboarding gate and by every endpoint that
    // needs one (e.g. adding a team member), not by a NOT NULL column, since an
    // account has to exist for a moment before it can choose one. Always stored
    // lowercased; UsernameService is the only writer and normalizes on the way
    // in, so this column can be compared/joined directly without a
    // LOWER(username) everywhere.
    @Column(nullable = true, unique = true, length = 30)
    private String username;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
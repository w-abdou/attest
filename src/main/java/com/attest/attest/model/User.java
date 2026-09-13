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

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // The Sui address this user has linked (from a connected wallet). Null until
    // they link one. Unique so no two accounts can claim the same address.
    @Column(nullable = true, unique = true)
    private String suiAddress;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
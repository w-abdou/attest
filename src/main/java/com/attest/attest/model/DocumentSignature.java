package com.attest.attest.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "document_signatures",
        uniqueConstraints = @UniqueConstraint(columnNames = {"documentId", "signerId"}))
@Getter
@Setter
@NoArgsConstructor
public class DocumentSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long documentId;

    @Column(nullable = false)
    private Long signerId;

    @Column(nullable = true)
    private String envelopeHash;

    // The Sui transaction digest of the on-chain sign() call.
    @Column(nullable = true)
    private String onchainTxDigest;

    // The Sui address that signed on-chain (from the connected wallet).
    @Column(nullable = true)
    private String signerAddress;

    @Column(nullable = false)
    private Instant signedAt = Instant.now();
}
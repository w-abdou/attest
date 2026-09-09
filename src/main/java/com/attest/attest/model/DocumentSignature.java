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

    // The document's envelopeHash at the moment this signature was made. If the
    // document's envelopeHash later changes (signers reassigned), this signature
    // no longer matches and is treated as stale/invalid.
    @Column(nullable = true)
    private String envelopeHash;

    @Column(nullable = false)
    private Instant signedAt = Instant.now();
}
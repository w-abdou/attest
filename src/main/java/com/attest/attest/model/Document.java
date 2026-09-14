package com.attest.attest.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String contentType;

    // Nullable: a Walrus-backed document (storageBackend = "WALRUS") never has a
    // local path — the browser uploads straight to Walrus, so the backend never
    // sees the bytes and has nothing to store on disk. Requires the same manual
    // migration as any other newly-nullable column on an existing table
    // (ALTER TABLE documents ALTER COLUMN storage_reference DROP NOT NULL) —
    // see docs/security-assessment.md.
    @Column(nullable = true)
    private String storageReference;

    // "LOCAL" (default, existing documents) or "WALRUS". Null is treated as
    // "LOCAL" everywhere this is read, so pre-existing rows need no backfill.
    @Column(nullable = true)
    private String storageBackend;

    // Walrus blob id (nullable — only set for storageBackend = "WALRUS").
    @Column(nullable = true)
    private String walrusBlobId;

    // The on-chain Sui object id for the certified Blob (nullable, WALRUS only).
    @Column(nullable = true)
    private String walrusBlobObjectId;

    // Base64 raw AES-256-GCM key, present only for a document encrypted under
    // the older locally-managed-key scheme (nullable — unencrypted Walrus
    // documents, Seal-encrypted documents, and all LOCAL documents leave this
    // null). Kept only for backward compatibility with documents encrypted
    // before Seal landed; every new upload uses Seal instead. See
    // docs/security-assessment.md "Seal access control".
    @Column(nullable = true)
    private String encryptionKeyBase64;

    // Whether this document's Walrus ciphertext is Seal-protected (the
    // decryption key is gated by the on-chain seal_approve policy, not
    // handed out to anyone who can read this row). Null/false for LOCAL
    // documents, unencrypted Walrus documents, and documents still on the
    // older local-AES scheme (encryptionKeyBase64 set instead).
    @Column(nullable = true)
    private Boolean sealEncrypted;

    // The Seal identity (hex, see lib/sealId.ts) this document's ciphertext
    // was encrypted under — set at upload time for a Seal-encrypted document,
    // and (arbitrarily, since it's never read back) at registration time
    // otherwise, since register_document's document_id argument is always
    // required. Nullable only because it doesn't exist before either of
    // those happens.
    @Column(nullable = true)
    private String sealIdHex;

    @Column(nullable = false)
    private Long ownerId;

    @Column(nullable = false)
    private Long teamId;

    @Column(nullable = false)
    private String documentHash;

    @Column(nullable = true)
    private Long rootDocumentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentStatus status = DocumentStatus.DRAFT;

    @Column(nullable = false)
    private Integer version = 1;

    @Column(nullable = true)
    private String policyHash;

    @Column(nullable = true)
    private String envelopeHash;

    @Column(nullable = true)
    private Instant expiry;

    @Column(nullable = true)
    private String onchainObjectId;

    @Column(nullable = true)
    private String onchainPackageId;

    @Column(nullable = true)
    private String onchainNetwork;

    @Column(nullable = true)
    private String onchainTxDigest;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
}
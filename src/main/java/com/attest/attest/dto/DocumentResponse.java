package com.attest.attest.dto;

import com.attest.attest.model.Document;
import com.attest.attest.model.DocumentStatus;

import java.time.Instant;

public record DocumentResponse(
        Long id,
        String filename,
        String contentType,
        DocumentStatus status,
        Integer version,
        Long rootDocumentId,
        String documentHash,
        Long ownerId,
        Long teamId,
        String policyHash,
        String envelopeHash,
        Instant expiry,
        String onchainObjectId,
        String onchainPackageId,
        String onchainNetwork,
        String onchainTxDigest,
        String storageBackend,
        String walrusBlobId,
        String walrusBlobObjectId,
        // Present only for a client-encrypted Walrus document. Handed back to
        // any caller who could already read this document's other metadata
        // (i.e. the same team-membership authorization as everything else on
        // this DTO) — there is no per-signer access control on the key yet,
        // that requires Seal. See docs/security-assessment.md "Walrus
        // decentralized storage".
        String encryptionKeyBase64,
        Instant createdAt
) {
    public static DocumentResponse from(Document doc) {
        return new DocumentResponse(
                doc.getId(),
                doc.getFilename(),
                doc.getContentType(),
                doc.getStatus(),
                doc.getVersion(),
                doc.getRootDocumentId(),
                doc.getDocumentHash(),
                doc.getOwnerId(),
                doc.getTeamId(),
                doc.getPolicyHash(),
                doc.getEnvelopeHash(),
                doc.getExpiry(),
                doc.getOnchainObjectId(),
                doc.getOnchainPackageId(),
                doc.getOnchainNetwork(),
                doc.getOnchainTxDigest(),
                doc.getStorageBackend() == null ? "LOCAL" : doc.getStorageBackend(),
                doc.getWalrusBlobId(),
                doc.getWalrusBlobObjectId(),
                doc.getEncryptionKeyBase64(),
                doc.getCreatedAt()
        );
    }
}

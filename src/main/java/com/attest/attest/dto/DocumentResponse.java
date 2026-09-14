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
        // Present only for a document still on the older locally-managed-key
        // scheme (pre-Seal). Handed back to any caller who could already read
        // this document's other metadata — there was no per-signer access
        // control on this key, which is exactly what Seal (below) replaces
        // for every new upload. See docs/security-assessment.md "Seal access
        // control".
        String encryptionKeyBase64,
        // True when the blob is Seal-protected — the decryption key is gated
        // by the on-chain seal_approve policy, never stored or handed back
        // by this API at all.
        boolean sealEncrypted,
        // The Seal identity (hex) this document was encrypted under, if any.
        // Needed by the frontend to build the seal_approve call at decrypt
        // time and the register_document call at registration time.
        String sealIdHex,
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
                Boolean.TRUE.equals(doc.getSealEncrypted()),
                doc.getSealIdHex(),
                doc.getCreatedAt()
        );
    }
}

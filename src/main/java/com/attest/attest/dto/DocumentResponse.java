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
                doc.getCreatedAt()
        );
    }
}
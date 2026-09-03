package com.attest.attest.dto;

import com.attest.attest.model.AuditLog;

import java.time.Instant;

public record AuditLogResponse(
        Long id,
        Long documentId,
        String action,
        Long performedBy,
        Instant timestamp,
        String detail
) {
    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getDocumentId(),
                log.getAction(),
                log.getPerformedBy(),
                log.getTimestamp(),
                log.getDetail()
        );
    }
}
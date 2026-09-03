package com.attest.attest.repository;

import com.attest.attest.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByDocumentIdOrderByTimestampAsc(Long documentId);
    List<AuditLog> findByDocumentIdInOrderByTimestampAsc(List<Long> documentIds);
}
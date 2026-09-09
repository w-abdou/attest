package com.attest.attest.repository;

import com.attest.attest.model.DocumentSignature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentSignatureRepository extends JpaRepository<DocumentSignature, Long> {
    List<DocumentSignature> findByDocumentId(Long documentId);
    Optional<DocumentSignature> findByDocumentIdAndSignerId(Long documentId, Long signerId);
    void deleteByDocumentId(Long documentId);
}
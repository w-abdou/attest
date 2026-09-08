package com.attest.attest.repository;

import com.attest.attest.model.DocumentSigner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentSignerRepository extends JpaRepository<DocumentSigner, Long> {
    List<DocumentSigner> findByDocumentId(Long documentId);
    Optional<DocumentSigner> findByDocumentIdAndUserId(Long documentId, Long userId);
    void deleteByDocumentId(Long documentId);
}
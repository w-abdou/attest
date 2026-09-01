package com.attest.attest.service;

import com.attest.attest.exception.DocumentNotFoundException;
import com.attest.attest.model.AuditLog;
import com.attest.attest.model.Document;
import com.attest.attest.repository.AuditLogRepository;
import com.attest.attest.repository.DocumentRepository;
import com.attest.attest.storage.DocumentStorageService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentStorageService storageService;
    private final HashService hashService;
    private final AuditLogRepository auditLogRepository;

    public DocumentService(DocumentRepository documentRepository, DocumentStorageService storageService, HashService hashService, AuditLogRepository auditLogRepository) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.hashService = hashService;
        this.auditLogRepository = auditLogRepository;
    }

    public Document upload(MultipartFile file, Long ownerId) throws IOException {
        byte[] fileBytes = file.getBytes();
        String hash = hashService.sha256(fileBytes);
        String reference = storageService.store(file);

        Document doc = new Document();
        doc.setFilename(file.getOriginalFilename());
        doc.setContentType(file.getContentType());
        doc.setStorageReference(reference);
        doc.setDocumentHash(hash);
        doc.setOwnerId(ownerId);
        documentRepository.save(doc);

        doc.setRootDocumentId(doc.getId());
        documentRepository.save(doc);

        logAction(doc.getId(), "UPLOADED", ownerId, "version " + doc.getVersion());

        return doc;
    }

    public VerifyResult verify(Long id, MultipartFile file) throws IOException {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));

        String uploadedHash = hashService.sha256(file.getBytes());
        boolean matches = uploadedHash.equals(doc.getDocumentHash());

        logAction(doc.getId(), matches ? "VERIFY_SUCCESS" : "VERIFY_FAILED", 0L, null);

        return new VerifyResult(doc.getId(), matches);
    }

    public Document amend(Long id, MultipartFile file, Long ownerId) throws IOException {
        Document original = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));

        Long rootId = original.getRootDocumentId();
        Integer maxVersion = documentRepository.findAll().stream()
                .filter(d -> rootId.equals(d.getRootDocumentId()))
                .map(Document::getVersion)
                .max(Integer::compareTo)
                .orElse(original.getVersion());

        byte[] fileBytes = file.getBytes();
        String hash = hashService.sha256(fileBytes);
        String reference = storageService.store(file);

        Document newVersion = new Document();
        newVersion.setFilename(file.getOriginalFilename());
        newVersion.setContentType(file.getContentType());
        newVersion.setStorageReference(reference);
        newVersion.setDocumentHash(hash);
        newVersion.setOwnerId(ownerId);
        newVersion.setVersion(maxVersion + 1);
        newVersion.setRootDocumentId(rootId);
        documentRepository.save(newVersion);

        logAction(newVersion.getId(), "AMENDED", ownerId, "new version " + newVersion.getVersion() + " of root " + rootId);

        return newVersion;
    }

    private void logAction(Long documentId, String action, Long performedBy, String detail) {
        AuditLog log = new AuditLog();
        log.setDocumentId(documentId);
        log.setAction(action);
        log.setPerformedBy(performedBy);
        log.setDetail(detail);
        auditLogRepository.save(log);
    }

    public record VerifyResult(Long documentId, boolean verified) {
        public String resultMessage() {
            return verified ? "Hash verified" : "Integrity verification failed";
        }
    }
}
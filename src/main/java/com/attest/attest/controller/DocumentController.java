package com.attest.attest.controller;

import com.attest.attest.model.Document;
import com.attest.attest.repository.DocumentRepository;
import com.attest.attest.service.HashService;
import com.attest.attest.storage.DocumentStorageService;
import com.attest.attest.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import com.attest.attest.model.AuditLog;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentRepository documentRepository;
    private final DocumentStorageService storageService;
    private final HashService hashService;
    private final AuditLogRepository auditLogRepository;

    public DocumentController(DocumentRepository documentRepository, DocumentStorageService storageService, HashService hashService, AuditLogRepository auditLogRepository) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.hashService = hashService;
        this.auditLogRepository = auditLogRepository;
    }

    @PostMapping
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("ownerId") Long ownerId
    ) {
        try {
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

            AuditLog log = new AuditLog();
            log.setDocumentId(doc.getId());
            log.setAction("UPLOADED");
            log.setPerformedBy(ownerId);
            log.setDetail("version " + doc.getVersion());
            auditLogRepository.save(log);

            return ResponseEntity.ok(Map.of(
                    "id", doc.getId(),
                    "filename", doc.getFilename(),
                    "status", doc.getStatus(),
                    "version", doc.getVersion(),
                    "documentHash", doc.getDocumentHash()
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to store file"));
        }
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verify(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        try {
            Document doc = documentRepository.findById(id)
                    .orElse(null);

            if (doc == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Document not found"));
            }

            String uploadedHash = hashService.sha256(file.getBytes());
            boolean matches = uploadedHash.equals(doc.getDocumentHash());


            AuditLog log = new AuditLog();
            log.setDocumentId(doc.getId());
            log.setAction(matches ? "VERIFY_SUCCESS" : "VERIFY_FAILED");
            log.setPerformedBy(0L);
            auditLogRepository.save(log);


            return ResponseEntity.ok(Map.of(
                    "documentId", doc.getId(),
                    "result", matches ? "Hash verified" : "Integrity verification failed",
                    "verified", matches
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to read file"));
        }
    }



    @PostMapping("/{id}/amend")
    public ResponseEntity<?> amend(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("ownerId") Long ownerId
    ) {
        try {
            Document original = documentRepository.findById(id).orElse(null);
            if (original == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Document not found"));
            }

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

            AuditLog log = new AuditLog();
            log.setDocumentId(newVersion.getId());
            log.setAction("AMENDED");
            log.setPerformedBy(ownerId);
            log.setDetail("new version " + newVersion.getVersion() + " of root " + rootId);
            auditLogRepository.save(log);

            return ResponseEntity.ok(Map.of(
                    "id", newVersion.getId(),
                    "rootDocumentId", newVersion.getRootDocumentId(),
                    "version", newVersion.getVersion(),
                    "documentHash", newVersion.getDocumentHash()
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to process amendment"));
        }
    }

}
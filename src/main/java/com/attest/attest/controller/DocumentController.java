package com.attest.attest.controller;

import com.attest.attest.model.Document;
import com.attest.attest.repository.DocumentRepository;
import com.attest.attest.service.HashService;
import com.attest.attest.storage.DocumentStorageService;
import org.springframework.http.ResponseEntity;
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

    public DocumentController(DocumentRepository documentRepository, DocumentStorageService storageService, HashService hashService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.hashService = hashService;
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

            return ResponseEntity.ok(Map.of(
                    "documentId", doc.getId(),
                    "result", matches ? "Hash verified" : "Integrity verification failed",
                    "verified", matches
            ));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to read file"));
        }
    }
}
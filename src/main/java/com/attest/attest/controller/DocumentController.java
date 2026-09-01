package com.attest.attest.controller;

import com.attest.attest.model.Document;
import com.attest.attest.service.DocumentService;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("ownerId") @NotNull Long ownerId
    ) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not be empty"));
        }

        Document doc = documentService.upload(file, ownerId);

        return ResponseEntity.ok(Map.of(
                "id", doc.getId(),
                "filename", doc.getFilename(),
                "status", doc.getStatus(),
                "version", doc.getVersion(),
                "documentHash", doc.getDocumentHash()
        ));
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verify(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        DocumentService.VerifyResult result = documentService.verify(id, file);

        return ResponseEntity.ok(Map.of(
                "documentId", result.documentId(),
                "result", result.resultMessage(),
                "verified", result.verified()
        ));
    }

    @PostMapping("/{id}/amend")
    public ResponseEntity<?> amend(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("ownerId") @NotNull Long ownerId
    ) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not be empty"));
        }

        Document newVersion = documentService.amend(id, file, ownerId);

        return ResponseEntity.ok(Map.of(
                "id", newVersion.getId(),
                "rootDocumentId", newVersion.getRootDocumentId(),
                "version", newVersion.getVersion(),
                "documentHash", newVersion.getDocumentHash()
        ));
    }
}
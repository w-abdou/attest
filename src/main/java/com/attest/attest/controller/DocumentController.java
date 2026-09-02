package com.attest.attest.controller;

import com.attest.attest.model.Document;
import com.attest.attest.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
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
            HttpServletRequest request
    ) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not be empty"));
        }

        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");

        Document doc = documentService.upload(file, requesterId, requesterRole);

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
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) throws IOException {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");
        DocumentService.VerifyResult result = documentService.verify(id, file, requesterId, requesterRole);

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
            HttpServletRequest request
    ) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not be empty"));
        }

        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");

        Document newVersion = documentService.amend(id, file, requesterId, requesterRole);

        return ResponseEntity.ok(Map.of(
                "id", newVersion.getId(),
                "rootDocumentId", newVersion.getRootDocumentId(),
                "version", newVersion.getVersion(),
                "documentHash", newVersion.getDocumentHash()
        ));
    }
}
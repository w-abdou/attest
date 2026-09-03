package com.attest.attest.controller;

import com.attest.attest.dto.AuditLogResponse;
import com.attest.attest.dto.DocumentResponse;
import com.attest.attest.dto.VerifyResponse;
import com.attest.attest.model.AuditLog;
import com.attest.attest.model.Document;
import com.attest.attest.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> list(HttpServletRequest request) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        List<Document> docs = documentService.listDocuments(requesterId);
        return ResponseEntity.ok(docs.stream().map(DocumentResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) throws IOException {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");

        Document doc = documentService.upload(file, requesterId, requesterRole);

        return ResponseEntity.ok(DocumentResponse.from(doc));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> get(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");

        Document doc = documentService.getDocument(id, requesterId, requesterRole);

        return ResponseEntity.ok(DocumentResponse.from(doc));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<DocumentResponse>> versions(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");

        List<Document> versions = documentService.getVersions(id, requesterId, requesterRole);

        return ResponseEntity.ok(versions.stream().map(DocumentResponse::from).toList());
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<AuditLogResponse>> audit(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");

        List<AuditLog> logs = documentService.getAuditTrail(id, requesterId, requesterRole);

        return ResponseEntity.ok(logs.stream().map(AuditLogResponse::from).toList());
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<VerifyResponse> verify(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) throws IOException {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");
        DocumentService.VerifyResult result = documentService.verify(id, file, requesterId, requesterRole);

        return ResponseEntity.ok(new VerifyResponse(result.documentId(), result.verified(), result.resultMessage()));
    }

    @PostMapping("/{id}/amend")
    public ResponseEntity<DocumentResponse> amend(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) throws IOException {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        String requesterRole = (String) request.getAttribute("authenticatedRole");

        Document newVersion = documentService.amend(id, file, requesterId, requesterRole);

        return ResponseEntity.ok(DocumentResponse.from(newVersion));
    }
}
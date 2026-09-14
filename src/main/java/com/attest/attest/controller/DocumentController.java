package com.attest.attest.controller;

import com.attest.attest.dto.*;
import com.attest.attest.model.*;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final UserRepository userRepository;

    public DocumentController(DocumentService documentService, UserRepository userRepository) {
        this.documentService = documentService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> list(HttpServletRequest request) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        return ResponseEntity.ok(documentService.listDocumentsForUser(requesterId).stream().map(DocumentResponse::from).toList());
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<List<DocumentResponse>> listForTeam(@PathVariable Long teamId, HttpServletRequest request) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        return ResponseEntity.ok(documentService.listDocumentsForTeam(teamId, requesterId).stream().map(DocumentResponse::from).toList());
    }

    @PostMapping("/team/{teamId}")
    public ResponseEntity<DocumentResponse> upload(@PathVariable Long teamId, @RequestParam("file") MultipartFile file, HttpServletRequest request) throws IOException {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        Document doc = documentService.upload(file, teamId, requesterId);
        return ResponseEntity.ok(DocumentResponse.from(doc));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> get(@PathVariable Long id, HttpServletRequest request) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        return ResponseEntity.ok(DocumentResponse.from(documentService.getDocument(id, requesterId)));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<DocumentResponse>> versions(@PathVariable Long id, HttpServletRequest request) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        return ResponseEntity.ok(documentService.getVersions(id, requesterId).stream().map(DocumentResponse::from).toList());
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<AuditLogResponse>> audit(@PathVariable Long id, HttpServletRequest request) {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        return ResponseEntity.ok(documentService.getAuditTrail(id, requesterId).stream().map(AuditLogResponse::from).toList());
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<VerifyResponse> verify(@PathVariable Long id, @RequestParam("file") MultipartFile file, HttpServletRequest request) throws IOException {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        DocumentService.VerifyResult result = documentService.verify(id, file, requesterId);
        return ResponseEntity.ok(new VerifyResponse(result.documentId(), result.verified(), result.resultMessage()));
    }

    @PostMapping("/{id}/amend")
    public ResponseEntity<DocumentResponse> amend(@PathVariable Long id, @RequestParam("file") MultipartFile file, HttpServletRequest request) throws IOException {
        Long requesterId = (Long) request.getAttribute("authenticatedUserId");
        return ResponseEntity.ok(DocumentResponse.from(documentService.amend(id, file, requesterId)));
    }

    @PutMapping("/{id}/signers")
    public ResponseEntity<Void> assignSigners(@PathVariable Long id, @Valid @RequestBody AssignSignersRequest request, HttpServletRequest http) {
        Long requesterId = (Long) http.getAttribute("authenticatedUserId");
        documentService.assignSigners(id, request.signerUserIds(), requesterId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/signers")
    public ResponseEntity<List<SignatureResponse>> signers(@PathVariable Long id, HttpServletRequest http) {
        Long requesterId = (Long) http.getAttribute("authenticatedUserId");
        Document doc = documentService.getDocument(id, requesterId);
        String currentEnvelope = doc.getEnvelopeHash();

        List<DocumentSigner> required = documentService.getSigners(id, requesterId);
        List<DocumentSignature> sigs = documentService.getSignatures(id, requesterId);

        List<SignatureResponse> result = required.stream().map(r -> {
            User u = userRepository.findById(r.getUserId()).orElse(null);
            String username = u != null ? u.getUsername() : null;
            String email = u != null ? u.getEmail() : "(unknown)";
            String suiAddress = u != null ? u.getSuiAddress() : null;
            var sig = sigs.stream()
                    .filter(s -> s.getSignerId().equals(r.getUserId()))
                    .filter(s -> currentEnvelope != null && currentEnvelope.equals(s.getEnvelopeHash()))
                    .findFirst();
            return new SignatureResponse(r.getUserId(), username, email, suiAddress, sig.isPresent(), sig.map(DocumentSignature::getSignedAt).orElse(null));
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/sign")
    public ResponseEntity<Void> sign(@PathVariable Long id, HttpServletRequest http) {
        Long requesterId = (Long) http.getAttribute("authenticatedUserId");
        documentService.sign(id, requesterId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/onchain-registration")
    public ResponseEntity<DocumentResponse> recordOnchain(@PathVariable Long id,
                                                          @Valid @RequestBody OnchainRegistrationRequest req,
                                                          HttpServletRequest http) {
        Long requesterId = (Long) http.getAttribute("authenticatedUserId");
        Document doc = documentService.recordOnchainRegistration(
                id, req.objectId(), req.txDigest(),
                com.attest.attest.model.Document.class.getName().isEmpty() ? null : null,
                null, requesterId);
        return ResponseEntity.ok(DocumentResponse.from(doc));
    }
}